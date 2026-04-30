import { basename, dirname, resolve } from 'path'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { findCanonicalGitRoot, gitExe } from '../../utils/git.js'
import { WORKFLOW_STATE_TOOL_NAME } from '../../tools/WorkflowStateTool/constants.js'
import {
  getCtProjectRoot,
  getCtWorkExecutionPath,
  getCtWorkIntentPath,
  getCtWorkPhasePath,
  getCtWorkPlanPath,
  getCtWorkResearchPath,
  getCtWorkVerificationPath,
} from '../projectIdentity/paths.js'
import {
  assessAutoworkEligibility,
  assessAutoworkHygiene,
  type AutoworkEligibilityResult,
} from './eligibility.js'
import { selectAutoworkMode } from './modeSelection.js'
import {
  parseAutoworkPlanFile,
  type AutoworkPlanChunk,
  type AutoworkPlanParseResult,
} from './planParser.js'
import {
  verifyAutoworkPostChunkCommit,
  verifyAutoworkPostCommitCleanTree,
  verifyAutoworkPreChunkGitState,
} from './gitChecks.js'
import {
  sendAutoworkTelegramDebtNotice,
  sendAutoworkTelegramStopNotice,
} from './telegramAlerts.js'
import {
  readAutoworkState,
  type AutoworkExecutionScope,
  type AutoworkMode,
  type AutoworkContinuationDebt,
  type AutoworkStartupInspection,
  type AutoworkState,
  type AutoworkValidationResult,
  updateAutoworkState,
} from './state.js'
import {
  getAutoworkRunPolicy,
  isAutoworkRelaxableFailureCode,
  type AutoworkRunPolicy,
} from './policy.js'
import { resolveAutoworkValidationPlan } from './validation.js'
import {
  createWorkstreamId,
  peekActiveWorkstream,
  startActiveWorkstream,
  type WorkflowResolution,
  setActiveWorkstreamPhase,
  updateWorkExecutionPacket,
  updateWorkVerificationPacket,
} from '../projectIdentity/workflowState.js'
import {
  type AutoworkRuntimeWindow,
  resolveAutoworkRuntimeWindow,
} from './runtimeWindow.js'

const AUTOWORK_BASH_TIMEOUT_MS = 30 * 60 * 1000

export type AutoworkEntryPoint = 'autowork' | 'swim'
type AutoworkLifecycleMode = Extract<
  AutoworkMode,
  'discovery' | 'research' | 'plan-hardening' | 'audit-and-polish'
>

function isLifecycleMode(mode: AutoworkMode): mode is AutoworkLifecycleMode {
  return (
    mode === 'discovery' ||
    mode === 'research' ||
    mode === 'plan-hardening' ||
    mode === 'audit-and-polish'
  )
}

async function getGitStatusShortLines(repoRoot: string): Promise<string[]> {
  const { stdout } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'status', '--short'],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

async function getCurrentBranch(repoRoot: string): Promise<string | null> {
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['branch', '--show-current'],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  if (code !== 0) {
    return null
  }

  const branch = stdout.trim()
  return branch || null
}

async function getLatestRelevantCommits(
  repoRoot: string,
  limit: number = 5,
): Promise<string[]> {
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['log', '--oneline', `-${String(limit)}`],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  if (code !== 0) {
    return []
  }

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

export type AutoworkStartupContext = {
  repoRoot: string | null
  planPath: string | null
  state: AutoworkState
  runPolicy: AutoworkRunPolicy
  inspection: AutoworkStartupInspection
  parsedPlan: AutoworkPlanParseResult
  eligibility: AutoworkEligibilityResult
  workflowResolution: WorkflowResolution | null
  mode: AutoworkMode
  modeReason: string
  nextPendingChunkId: string | null
}

export type AutoworkSafeExecutionLaunch =
  | {
      ok: true
      repoRoot: string
      planPath: string | null
      chunkId: string
      visibleMessage: string
      metaMessages: string[]
      nextInput: string
    }
  | {
      ok: false
      message: string
    }

export type AutoworkVerificationResult =
  | {
      ok: true
      message: string
      chunkId: string
      commitSha: string
      nextPendingChunkId: string | null
      nextInput?: string
    }
  | {
      ok: false
      message: string
    }

function createAutoworkContinuationDebt(
  code: string,
  message: string,
  failedCheck?: string,
  chunkId?: string,
): AutoworkContinuationDebt {
  return {
    code,
    message,
    failedCheck,
    chunkId,
    capturedAt: Date.now(),
  }
}

function appendUniqueContinuationDebt(
  current: AutoworkContinuationDebt[],
  additions: AutoworkContinuationDebt[],
): AutoworkContinuationDebt[] {
  const next = [...current]

  for (const debt of additions) {
    const exists = next.some(
      existing =>
        existing.code === debt.code &&
        existing.message === debt.message &&
        existing.failedCheck === debt.failedCheck &&
        existing.chunkId === debt.chunkId,
    )

    if (!exists) {
      next.push(debt)
    }
  }

  return next
}

function formatContinuationDebtLines(
  debts: AutoworkContinuationDebt[],
): string[] {
  return debts.map(debt =>
    debt.failedCheck
      ? `- ${debt.code}: ${debt.message} [${debt.failedCheck}]`
      : `- ${debt.code}: ${debt.message}`,
  )
}

function getEffectivePendingChunks(
  context: AutoworkStartupContext,
): AutoworkPlanChunk[] {
  if (!context.parsedPlan.ok) {
    return []
  }

  const completedChunkIds = new Set(context.state.completedChunkIds)
  const failedChunkIds = new Set(context.state.failedChunkIds)

  return context.parsedPlan.chunks.filter(
    chunk =>
      chunk.status === 'pending' &&
      !completedChunkIds.has(chunk.id) &&
      !failedChunkIds.has(chunk.id),
  )
}

function getActiveChunk(
  context: AutoworkStartupContext,
): AutoworkPlanChunk | null {
  if (!context.parsedPlan.ok || !context.state.currentChunkId) {
    return null
  }

  return (
    context.parsedPlan.chunks.find(
      chunk => chunk.id === context.state.currentChunkId,
    ) ?? null
  )
}

function getProjectName(repoRoot: string): string {
  return basename(repoRoot) || 'the project'
}

function normalizeSummary(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function getBunAwareEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  const home = env.HOME
  if (!home) {
    return env
  }

  const bunBinPath = resolve(home, '.bun', 'bin')
  if (!getFsImplementation().existsSync(bunBinPath)) {
    return env
  }

  const pathEntries = (env.PATH ?? '').split(':').filter(Boolean)
  if (!pathEntries.includes(bunBinPath)) {
    env.PATH = [bunBinPath, ...pathEntries].join(':')
  }

  return env
}

async function runAutoworkShellCommand(
  command: string,
  repoRoot: string,
): Promise<AutoworkValidationResult & { stdout: string; stderr: string }> {
  const { stdout, stderr, code, error } = await execFileNoThrowWithCwd(
    'zsh',
    ['-lc', command],
    {
      cwd: repoRoot,
      env: getBunAwareEnv(),
      timeout: AUTOWORK_BASH_TIMEOUT_MS,
      preserveOutputOnError: true,
    },
  )

  const summarySource = [stderr.trim(), stdout.trim(), error ?? '']
    .filter(Boolean)
    .join('\n')

  return {
    command,
    ok: code === 0,
    summary: normalizeSummary(summarySource).slice(0, 500) || undefined,
    checkedAt: Date.now(),
    stdout,
    stderr,
  }
}

function formatValidationLines(results: AutoworkValidationResult[]): string[] {
  return results.map(result =>
    result.summary
      ? `- ${result.command}: ${result.ok ? 'ok' : 'failed'} - ${result.summary}`
      : `- ${result.command}: ${result.ok ? 'ok' : 'failed'}`,
  )
}

function getLifecyclePhaseForMode(mode: AutoworkLifecycleMode): 'intent' | 'research' | 'plan' | 'review' {
  switch (mode) {
    case 'discovery':
      return 'intent'
    case 'research':
      return 'research'
    case 'plan-hardening':
      return 'plan'
    case 'audit-and-polish':
      return 'review'
  }
}

function getLifecycleStatusText(mode: AutoworkLifecycleMode): string {
  switch (mode) {
    case 'discovery':
      return 'Capturing workstream intent'
    case 'research':
      return 'Research wave active'
    case 'plan-hardening':
      return 'Plan hardening wave active'
    case 'audit-and-polish':
      return 'Broad review wave active'
  }
}

function getLifecycleActionLine(mode: AutoworkLifecycleMode): string {
  switch (mode) {
    case 'discovery':
      return 'Capture the active workstream intent and constraints before planning.'
    case 'research':
      return 'Research the blocking unknowns and record evidence into workflow state before planning or coding.'
    case 'plan-hardening':
      return 'Harden the executable plan and workflow packet so execution can proceed from a stable chunk graph.'
    case 'audit-and-polish':
      return 'Perform the broad review and final quality pass before calling the workstream done.'
  }
}

function buildLifecyclePacketPathLines(repoRoot: string): string[] {
  return [
    `- intent packet: ${getCtWorkIntentPath(repoRoot)}`,
    `- research packet: ${getCtWorkResearchPath(repoRoot)}`,
    `- plan packet: ${getCtWorkPlanPath(repoRoot)}`,
    `- execution packet: ${getCtWorkExecutionPath(repoRoot)}`,
    `- verification packet: ${getCtWorkVerificationPath(repoRoot)}`,
    `- phase packet: ${getCtWorkPhasePath(repoRoot)}`,
  ]
}

function buildAutoworkLifecyclePrompt(
  entryPoint: AutoworkEntryPoint,
  repoRoot: string,
  planPath: string | null,
  context: AutoworkStartupContext,
  mode: AutoworkLifecycleMode,
): string {
  const packetPathLines = buildLifecyclePacketPathLines(repoRoot)
  const workflowReason = context.workflowResolution?.reason ?? context.modeReason
  const nextStep = `/${entryPoint} run`

  return [
    '<system-reminder>',
    `CT ${entryPoint} lifecycle mode is active for ${getProjectName(repoRoot)}.`,
    `Current autowork mode: ${mode}.`,
    '',
    `Plan file: ${planPath ?? 'none yet'}`,
    `Workflow reason: ${workflowReason}`,
    '',
    'Authoritative workflow packet files:',
    ...packetPathLines,
    '',
    'Required workflow:',
    `1. ${getLifecycleActionLine(mode)}`,
    '2. Read the authoritative packet files before editing anything.',
    `3. Use ${WORKFLOW_STATE_TOOL_NAME} for workflow packet updates instead of hand-editing the JSON files.`,
    '4. Keep packet state valid and aligned: no contradictory phase/readiness stories.',
    '5. Preserve single source of truth by updating workflow packet state instead of inventing parallel scratch notes.',
    mode === 'plan-hardening'
      ? `6. If the tracked plan file needs hardening, edit the tracked plan file, then use ${WORKFLOW_STATE_TOOL_NAME} to sync the workflow plan packet from it.`
      : '6. Do not begin implementation chunks unless the workflow state legitimately advances there.',
    mode === 'audit-and-polish'
      ? `7. Review for production-grade completeness, record findings with ${WORKFLOW_STATE_TOOL_NAME}, and make only narrow fixes that are required by the review.`
      : `7. End with the workflow state advanced as far as the evidence supports using ${WORKFLOW_STATE_TOOL_NAME}, then stop.`,
    '',
    `When finished, the queued ${nextStep} command will reassess the workflow state and continue from the next correct phase.`,
    '</system-reminder>',
  ].join('\n')
}

function buildMissingPlanParseResult(root: string): AutoworkPlanParseResult {
  return {
    ok: false,
    path: resolve(root, '__autowork_no_plan__-state.md'),
    code: 'missing_plan_file',
    message:
      'No tracked executable plan file is active yet. Autowork can still capture intent, research, or harden a plan before execution begins.',
  }
}

function buildMissingPlanEligibilityResult(
  root: string,
  repoRoot: string | null,
): AutoworkEligibilityResult {
  const planPath = resolve(root, '__autowork_no_plan__-state.md')
  if (!repoRoot) {
    return {
      ok: false,
      code: 'not_in_git_repo',
      message: 'Autowork requires a git repository before it can start.',
      failedCheck: 'git-repo',
      repoRoot: null,
      planPath,
      checks: [
        {
          name: 'git-repo',
          ok: false,
          summary: 'Current working context is not inside a git repository.',
        },
      ],
    }
  }

  return {
    ok: false,
    code: 'missing_plan_file',
    message:
      'No tracked executable plan file is active yet. Lifecycle work may continue, but code execution cannot begin until a plan exists.',
    failedCheck: 'plan-file',
    repoRoot,
    planPath,
    checks: [
      {
        name: 'git-repo',
        ok: true,
        summary: `Repository root: ${repoRoot}`,
      },
      {
        name: 'plan-file',
        ok: false,
        summary:
          'No tracked executable plan file is active yet for this workstream.',
      },
    ],
  }
}

function shouldBlockLifecycleForEligibility(
  eligibility: AutoworkEligibilityResult,
): boolean {
  if (eligibility.ok) {
    return false
  }

  return (
    eligibility.code === 'not_in_git_repo' ||
    eligibility.code === 'ignore_hygiene_failed' ||
    eligibility.code === 'forbidden_tracked_files'
  )
}

function ensureAutoworkLifecycleWorkstream(
  repoRoot: string,
  context: AutoworkStartupContext,
  mode: AutoworkLifecycleMode,
): void {
  const existing = peekActiveWorkstream(repoRoot)
  if (existing?.resolution.workId) {
    return
  }

  const title = getProjectName(repoRoot)
  startActiveWorkstream(
    {
      workId: createWorkstreamId(title),
      title,
      summary: context.modeReason,
      currentPhase: getLifecyclePhaseForMode(mode),
      phaseReason: getLifecycleStatusText(mode),
    },
    repoRoot,
  )
}

function buildAutoworkExecutionPrompt(
  entryPoint: AutoworkEntryPoint,
  repoRoot: string,
  planPath: string,
  chunk: AutoworkPlanChunk,
  executionScope: AutoworkExecutionScope,
): string {
  const validationPlan = resolveAutoworkValidationPlan(chunk)
  const validationLines =
    validationPlan.commands.length > 0
      ? validationPlan.commands.map(
          command => `- ${command.command}: ${command.reason}`,
        )
      : ['- No build validation is required for this chunk.']

  const projectName = getProjectName(repoRoot)

  return [
    '<system-reminder>',
    `CT ${entryPoint} safe mode is active for ${projectName}.`,
    executionScope === 'plan'
      ? 'Execute exactly one chunk, stop, and hand control back to the verification gate. If that checkpoint passes and approved chunks remain, autowork will continue the plan automatically.'
      : 'Execute exactly one chunk and stop after the verification gate.',
    '',
    `Plan file: ${planPath}`,
    `Chunk: ${chunk.id}`,
    `Purpose: ${chunk.purpose}`,
    `Files/areas: ${chunk.files.join(', ') || 'none listed'}`,
    `Dependencies: ${chunk.dependencies.join(', ') || 'none listed'}`,
    `Risks: ${chunk.risks.join(', ') || 'none listed'}`,
    `Done: ${chunk.done}`,
    '',
    'Required workflow:',
    `1. Work only on chunk ${chunk.id}. Do not begin another chunk.`,
    '2. Inspect actual repo state before edits. Do not invent state.',
    '3. Keep edits surgical and reversible.',
    '4. Avoid research unless a real repo-local unknown blocks correctness.',
    '5. Run the required validation commands before finishing.',
    '6. Create one precise commit for this chunk before finishing.',
    '7. Leave the working tree clean after the commit.',
    '8. In the final response, report validation results, commit SHA, and whether the tree is clean.',
    '',
    'Validation commands for this chunk:',
    ...validationLines,
    '',
    `The queued /${entryPoint} verify command will run after your response and enforce the checkpoint.`,
    executionScope === 'plan'
      ? `If that checkpoint passes and more approved chunks remain, /${entryPoint} run will be queued automatically.`
      : `Step mode ends after that checkpoint, even if more approved chunks remain.`,
    '</system-reminder>',
  ].join('\n')
}

function buildStopMessage(
  code: string,
  message: string,
  chunkId?: string,
): string {
  return [
    'Autowork stopped.',
    '',
    `Reason: ${message}`,
    `Code: ${code}`,
    chunkId ? `Chunk: ${chunkId}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildTelegramStopNoticeSignature(
  code: string,
  message: string,
  chunkId?: string,
): string {
  return ['stop', code, chunkId ?? '', message].join('|')
}

function buildTelegramDebtNoticeSignature(
  chunkId: string,
  debts: readonly AutoworkContinuationDebt[],
): string {
  const debtKey = debts
    .map(debt =>
      [debt.code, debt.failedCheck ?? '', debt.chunkId ?? '', debt.message].join(':'),
    )
    .sort()
    .join(';')

  return ['debt', chunkId, debtKey].join('|')
}

function persistTelegramNoticeSignature(
  repoRoot: string,
  signature: string,
): void {
  updateAutoworkState(
    current => ({
      ...current,
      lastTelegramNoticeSignature: signature,
    }),
    repoRoot,
  )
}

function resolveStoppedWorkPhase(repoRoot: string): 'implementation' | 'verification' | 'review' {
  const workflow = peekActiveWorkstream(repoRoot)
  const phase = workflow?.packets.execution.phase ?? workflow?.resolution.phase
  if (phase === 'verification' || phase === 'review') {
    return phase
  }
  return 'implementation'
}

function syncAutoworkStopped(
  repoRoot: string,
  statusText: string,
  phaseReason: string,
): void {
  const now = Date.now()
  const phase = resolveStoppedWorkPhase(repoRoot)
  updateWorkExecutionPacket(
    current => ({
      ...current,
      phase,
      updatedAt: now,
      timeBudgetMs: null,
      deadlineAt: null,
      heartbeatEnabled: false,
      currentActions: [],
      blockedOn: [phaseReason],
      nextVerificationSteps: [],
      stopReason: phaseReason,
      swarmBackend: 'none',
      swarmActive: false,
      swarmWorkerCount: 0,
      statusText,
      lastActivityAt: now,
    }),
    repoRoot,
  )
  setActiveWorkstreamPhase(
    {
      phase,
      phaseReason,
    },
    repoRoot,
  )
}

function persistAutoworkStop(
  context: AutoworkStartupContext,
  code: string,
  message: string,
  failedCheck?: string,
  chunkId?: string,
): void {
  if (!context.repoRoot) {
    return
  }

  const noticeSignature = buildTelegramStopNoticeSignature(code, message, chunkId)
  const shouldNotify = context.state.lastTelegramNoticeSignature !== noticeSignature

  const telegramEscalationEnabled = context.state.telegramEscalationEnabled

  updateAutoworkState(
    current => ({
      ...current,
      currentMode: 'verification',
      stopReason: {
        code,
        message,
        failedCheck,
        chunkId,
        capturedAt: Date.now(),
      },
      lastFinishedAt: Date.now(),
    }),
    context.repoRoot,
  )
  syncAutoworkStopped(context.repoRoot, message, message)

  if (shouldNotify) {
    void sendAutoworkTelegramStopNotice({
      repoRoot: context.repoRoot,
      telegramEscalationEnabled,
      code,
      message,
      failedCheck,
      chunkId,
    }).then(result => {
      if (result.ok) {
        persistTelegramNoticeSignature(context.repoRoot!, noticeSignature)
      }
    })
  }
}

function syncAutoworkExecutionStarted(
  repoRoot: string,
  chunkId: string,
  executionScope: AutoworkExecutionScope,
  entryPoint: AutoworkEntryPoint,
  runtimeWindow: AutoworkRuntimeWindow,
): void {
  const now = Date.now()
  updateWorkExecutionPacket(
    current => ({
      ...current,
      phase: 'implementation',
      activeChunkId: chunkId,
      executionScope,
      startedAt: now,
      updatedAt: now,
      timeBudgetMs: runtimeWindow.timeBudgetMs,
      deadlineAt: runtimeWindow.deadlineAt,
      heartbeatEnabled: runtimeWindow.heartbeatEnabled,
      heartbeatIntervalMs: runtimeWindow.heartbeatIntervalMs,
      checkpointPolicy: runtimeWindow.checkpointPolicy,
      currentActions: [`Executing ${chunkId}`],
      blockedOn: [],
      nextVerificationSteps: [`/${entryPoint} verify`],
      continuationDebt: [],
      stopReason: null,
      swarmBackend: 'none',
      swarmActive: false,
      swarmWorkerCount: 0,
      statusText: `Executing ${chunkId}`,
      lastActivityAt: now,
    }),
    repoRoot,
  )
  setActiveWorkstreamPhase(
    {
      phase: 'implementation',
      phaseReason: `Autowork is executing ${chunkId}.`,
    },
    repoRoot,
  )
}

function syncAutoworkLifecycleModeStarted(
  repoRoot: string,
  mode: AutoworkLifecycleMode,
  runtimeWindow: AutoworkRuntimeWindow,
): void {
  const now = Date.now()
  const phase = getLifecyclePhaseForMode(mode)
  const statusText = getLifecycleStatusText(mode)
  updateWorkExecutionPacket(
    current => ({
      ...current,
      phase,
      activeChunkId: null,
      updatedAt: now,
      timeBudgetMs: runtimeWindow.timeBudgetMs,
      deadlineAt: runtimeWindow.deadlineAt,
      heartbeatEnabled: runtimeWindow.heartbeatEnabled,
      heartbeatIntervalMs: runtimeWindow.heartbeatIntervalMs,
      checkpointPolicy: runtimeWindow.checkpointPolicy,
      currentActions: [statusText],
      blockedOn: [],
      nextVerificationSteps: [],
      stopReason: null,
      swarmBackend: 'none',
      swarmActive: false,
      swarmWorkerCount: 0,
      statusText,
      lastActivityAt: now,
    }),
    repoRoot,
  )
  setActiveWorkstreamPhase(
    {
      phase,
      phaseReason: statusText,
    },
    repoRoot,
  )
}

function syncAutoworkVerificationBlocked(
  repoRoot: string,
  chunkId: string,
  reason: string,
): void {
  const now = Date.now()
  updateWorkExecutionPacket(
    current => ({
      ...current,
      phase: 'verification',
      activeChunkId: chunkId,
      updatedAt: now,
      timeBudgetMs: null,
      deadlineAt: null,
      heartbeatEnabled: false,
      currentActions: [],
      blockedOn: [reason],
      stopReason: reason,
      swarmBackend: 'none',
      swarmActive: false,
      swarmWorkerCount: 0,
      statusText: `Verification blocked for ${chunkId}`,
      lastActivityAt: now,
    }),
    repoRoot,
  )
  updateWorkVerificationPacket(
    current => ({
      ...current,
      status: 'failed',
      updatedAt: now,
      openDefects: current.openDefects.includes(reason)
        ? current.openDefects
        : [...current.openDefects, reason],
    }),
    repoRoot,
  )
  setActiveWorkstreamPhase(
    {
      phase: 'verification',
      phaseReason: reason,
    },
    repoRoot,
  )
}

function syncAutoworkVerificationComplete(
  repoRoot: string,
  chunkId: string,
  nextPendingChunkId: string | null,
  validationRuns: string[],
  keepRuntimeWindowActive: boolean,
): void {
  const now = Date.now()
  const phase = nextPendingChunkId ? 'implementation' : 'review'
  const statusText =
    nextPendingChunkId === null
      ? `Chunk ${chunkId} verified`
      : keepRuntimeWindowActive
        ? `Ready to continue with ${nextPendingChunkId}`
        : `Next approved chunk ${nextPendingChunkId} is ready`

  updateWorkExecutionPacket(
    current => ({
      ...current,
      phase,
      activeChunkId: null,
      updatedAt: now,
      timeBudgetMs: keepRuntimeWindowActive ? current.timeBudgetMs : null,
      deadlineAt: keepRuntimeWindowActive ? current.deadlineAt : null,
      heartbeatEnabled: keepRuntimeWindowActive ? current.heartbeatEnabled : false,
      currentActions: [],
      blockedOn: [],
      nextVerificationSteps: [],
      stopReason: null,
      swarmBackend: 'none',
      swarmActive: false,
      swarmWorkerCount: 0,
      statusText,
      lastActivityAt: now,
    }),
    repoRoot,
  )
  updateWorkVerificationPacket(
    current => ({
      ...current,
      status: 'verified',
      updatedAt: now,
      verifiedChunkIds: current.verifiedChunkIds.includes(chunkId)
        ? current.verifiedChunkIds
        : [...current.verifiedChunkIds, chunkId],
      validationRuns: Array.from(new Set([...current.validationRuns, ...validationRuns])),
    }),
    repoRoot,
  )
  setActiveWorkstreamPhase(
    {
      phase,
      phaseReason:
        nextPendingChunkId === null
          ? `Chunk ${chunkId} verified. Broad review is now active.`
          : keepRuntimeWindowActive
            ? `Chunk ${chunkId} verified. Remaining approved work continues with ${nextPendingChunkId}.`
            : `Chunk ${chunkId} verified. Remaining approved work is paused at ${nextPendingChunkId}.`,
    },
    repoRoot,
  )
}

function getActiveCloudOffloadGuardMessage(
  entryPoint: AutoworkEntryPoint,
): string {
  return [
    'Autowork already has an active background cloud-offload run for this workstream.',
    '',
    `Next: inspect /tasks for the remote autowork task, use /${entryPoint} status for workflow truth, or stop the cloud run before starting local execution here.`,
  ].join('\n')
}

function hasActiveCloudOffload(workflow: ReturnType<typeof peekActiveWorkstream>): boolean {
  return workflow?.packets.execution.swarmBackend === 'cloud'
    && workflow.packets.execution.swarmActive === true
}

export async function inspectAndSelectAutoworkMode(
  planPath: string | null,
): Promise<AutoworkStartupContext> {
  const root = getCtProjectRoot()
  const resolvedPlanPath = planPath ? resolve(planPath) : null
  const repoRoot = resolvedPlanPath
    ? findCanonicalGitRoot(dirname(resolvedPlanPath))
    : findCanonicalGitRoot(root)
  const state = readAutoworkState(repoRoot ?? undefined)
  const workflow = repoRoot ? peekActiveWorkstream(repoRoot) : null

  const [branch, gitStatusShort, latestRelevantCommits, parsedPlan, eligibility, hygiene] =
    repoRoot
      ? await Promise.all([
          getCurrentBranch(repoRoot),
          getGitStatusShortLines(repoRoot),
          getLatestRelevantCommits(repoRoot),
          resolvedPlanPath
            ? parseAutoworkPlanFile(resolvedPlanPath)
            : Promise.resolve(buildMissingPlanParseResult(root)),
          resolvedPlanPath
            ? assessAutoworkEligibility(resolvedPlanPath, state.runMode)
            : Promise.resolve(buildMissingPlanEligibilityResult(root, repoRoot)),
          assessAutoworkHygiene(repoRoot),
        ])
      : [
          null,
          [],
          [],
          ({
            ok: false,
            path: resolve(root, '__autowork_no_plan__-state.md'),
            code: 'plan_not_in_git_repo',
            message: 'Autowork plan file must live inside a git repository.',
          } as const),
          ({
            ok: false,
            code: 'not_in_git_repo',
            message: 'Autowork requires a git repository before it can start.',
            failedCheck: 'git-repo',
            repoRoot: null,
            planPath: resolve(root, '__autowork_no_plan__-state.md'),
            checks: [
              {
                name: 'git-repo',
                ok: false,
                summary: 'Current working context is not inside a git repository.',
              },
            ],
          } as const),
          {
            ok: false,
            missingIgnoreEntries: [],
            forbiddenTrackedFiles: [],
          },
        ]

  const inspection: AutoworkStartupInspection = {
    branch,
    gitStatusShort,
    latestRelevantCommits,
    hasUncommittedChanges: gitStatusShort.length > 0,
    hasExecutablePlanFile: parsedPlan.ok,
    hasRecentlyCompletedUnverifiedChunk:
      state.implementedButUnverified ||
      (parsedPlan.ok
        ? parsedPlan.chunks.some(
            chunk => chunk.status === 'implemented-but-unverified',
          )
        : false),
    validationKnownForLastChunk: state.lastValidationResult !== null,
    ignoreHygieneOk: hygiene.ok,
    capturedAt: Date.now(),
  }

  const decision =
    resolvedPlanPath === null && workflow === null
      ? {
          mode: 'discovery' as const,
          reason:
            'No active workstream exists yet. Autowork should capture intent before research or planning.',
          nextPendingChunkId: null,
        }
      : selectAutoworkMode(
          inspection,
          state,
          parsedPlan,
          workflow?.resolution ?? null,
        )

  return {
    repoRoot,
    planPath: resolvedPlanPath,
    state,
    runPolicy: getAutoworkRunPolicy(state.runMode),
    inspection,
    parsedPlan,
    eligibility,
    workflowResolution: workflow?.resolution ?? null,
    mode: decision.mode,
    modeReason: decision.reason,
    nextPendingChunkId: decision.nextPendingChunkId,
  }
}

export async function prepareAutoworkSafeExecution(
  planPath: string,
  entryPoint: AutoworkEntryPoint,
  executionScope: AutoworkExecutionScope = 'plan',
  requestedTimeBudgetMs: number | null = null,
): Promise<AutoworkSafeExecutionLaunch> {
  const context = await inspectAndSelectAutoworkMode(planPath)
  if (!context.repoRoot) {
    return { ok: false, message: 'Autowork requires a git repository.' }
  }

  const workflow = peekActiveWorkstream(context.repoRoot)
  if (hasActiveCloudOffload(workflow)) {
    return {
      ok: false,
      message: getActiveCloudOffloadGuardMessage(entryPoint),
    }
  }
  const runtimeWindow = resolveAutoworkRuntimeWindow(
    workflow?.packets.execution ?? null,
    { requestedTimeBudgetMs },
  )
  if (runtimeWindow.expired) {
    const message =
      'Autowork time budget expired at the last checkpoint. Start a new window before continuing.'
    persistAutoworkStop(
      context,
      'time_budget_expired',
      message,
      'time-budget',
      context.state.currentChunkId ?? context.nextPendingChunkId ?? undefined,
    )
    return { ok: false, message }
  }

  if (isLifecycleMode(context.mode)) {
    if (shouldBlockLifecycleForEligibility(context.eligibility)) {
      persistAutoworkStop(
        context,
        context.eligibility.code,
        context.eligibility.message,
        context.eligibility.failedCheck,
      )
      return { ok: false, message: context.eligibility.message }
    }

    ensureAutoworkLifecycleWorkstream(
      context.repoRoot,
      context,
      context.mode,
    )
  } else if (!context.eligibility.ok) {
    persistAutoworkStop(
      context,
      context.eligibility.code,
      context.eligibility.message,
      context.eligibility.failedCheck,
    )
    return { ok: false, message: context.eligibility.message }
  }

  if (isLifecycleMode(context.mode)) {
    const lifecycleMode = context.mode
    const prompt = buildAutoworkLifecyclePrompt(
      entryPoint,
      context.repoRoot,
      context.planPath,
      context,
      lifecycleMode,
    )
    const nextRunCount = context.state.runCount + 1
    updateAutoworkState(
      current => ({
        ...current,
        sourcePlanPath: context.planPath,
        currentChunkId: null,
        currentMode: lifecycleMode,
        lastStartupInspection: context.inspection,
        lastValidationResult: null,
        executionScope,
        stopReason: null,
        lastStartedAt: Date.now(),
        implementedButUnverified: false,
        runCount: nextRunCount,
      }),
      context.repoRoot,
    )
    syncAutoworkLifecycleModeStarted(context.repoRoot, lifecycleMode, runtimeWindow)

    return {
      ok: true,
      repoRoot: context.repoRoot,
      planPath: context.planPath,
      chunkId: lifecycleMode,
      visibleMessage: [
        '',
        `${getLifecycleStatusText(lifecycleMode)}.`,
        `Plan: ${context.planPath ?? 'none yet'}`,
        `Why: ${context.modeReason}`,
        `Queued next step: /${entryPoint} run`,
      ].join('\n'),
      metaMessages: [prompt],
      nextInput: `/${entryPoint} run`,
    }
  }

  if (context.mode !== 'execution') {
    return { ok: false, message: context.modeReason }
  }

  const nextChunk = getEffectivePendingChunks(context)[0]
  if (!nextChunk) {
    return { ok: false, message: 'Autowork could not find a pending chunk to run.' }
  }

  const gitCheck = await verifyAutoworkPreChunkGitState(context.repoRoot)
  const launchDebts: AutoworkContinuationDebt[] = []
  let preChunkHeadSha: string | null = gitCheck.ok ? gitCheck.snapshot.headSha : null

  if (!gitCheck.ok) {
    if (
      isAutoworkRelaxableFailureCode(context.state.runMode, gitCheck.code) &&
      gitCheck.snapshot?.headSha
    ) {
      preChunkHeadSha = gitCheck.snapshot.headSha
      launchDebts.push(
        createAutoworkContinuationDebt(
          gitCheck.code,
          gitCheck.message,
          'clean-tree',
          nextChunk.id,
        ),
      )
    } else {
      const message = gitCheck.message
      persistAutoworkStop(context, gitCheck.code, message, 'clean-tree', nextChunk.id)
      return { ok: false, message }
    }
  }

  if (!preChunkHeadSha) {
    const message = 'Autowork could not determine the pre-chunk HEAD commit.'
    persistAutoworkStop(
      context,
      'missing_pre_chunk_head',
      message,
      'commit-gate',
      nextChunk.id,
    )
    return { ok: false, message }
  }

  if (!context.planPath) {
    return {
      ok: false,
      message:
        'Autowork execution cannot begin because no tracked executable plan file is active yet.',
    }
  }

  const prompt = buildAutoworkExecutionPrompt(
    entryPoint,
    context.repoRoot,
    context.planPath,
    nextChunk,
    executionScope,
  )
  const nextRunCount = context.state.runCount + 1
  const visibleMessage = [
    '',
    `Launching ${nextChunk.id}.`,
    `Plan: ${context.planPath}`,
    executionScope === 'plan'
      ? 'Execution scope: plan to completion.'
      : 'Execution scope: one chunk only.',
    context.state.runMode === 'dangerous' && launchDebts.length > 0
      ? 'Dangerous-mode debt at launch:'
      : null,
    ...(context.state.runMode === 'dangerous'
      ? formatContinuationDebtLines(launchDebts)
      : []),
    `Queued next step: /${entryPoint} verify`,
    executionScope === 'plan'
      ? `If verification passes, /${entryPoint} run will continue the remaining approved plan automatically.`
      : 'Step mode will stop after verification.',
  ].join('\n')

  updateAutoworkState(
    current => ({
      ...current,
      sourcePlanPath: context.planPath,
      sourcePlanRevision: gitCheck.snapshot.headSha,
      currentChunkId: nextChunk.id,
      currentMode: 'execution',
      lastStartupInspection: context.inspection,
      lastValidationResult: null,
      lastCommitSha: preChunkHeadSha,
      rollbackRef: nextChunk.risks.length > 0 ? preChunkHeadSha : null,
      executionScope,
      continuationDebt: appendUniqueContinuationDebt([], launchDebts),
      stopReason: null,
      lastStartedAt: Date.now(),
      implementedButUnverified: true,
      runCount: nextRunCount,
    }),
    context.repoRoot,
  )
  syncAutoworkExecutionStarted(
    context.repoRoot,
    nextChunk.id,
    executionScope,
    entryPoint,
    runtimeWindow,
  )

  return {
    ok: true,
    repoRoot: context.repoRoot,
    planPath: context.planPath,
    chunkId: nextChunk.id,
    visibleMessage,
    metaMessages: [prompt],
    nextInput: `/${entryPoint} verify`,
  }
}

export async function verifyAutoworkSafeExecution(
  planPath: string,
  entryPoint: AutoworkEntryPoint,
): Promise<AutoworkVerificationResult> {
  const context = await inspectAndSelectAutoworkMode(planPath)
  if (!context.repoRoot) {
    return { ok: false, message: 'Autowork requires a git repository.' }
  }

  if (hasActiveCloudOffload(peekActiveWorkstream(context.repoRoot))) {
    return {
      ok: false,
      message: getActiveCloudOffloadGuardMessage(entryPoint),
    }
  }

  const activeChunk = getActiveChunk(context)
  if (!activeChunk || !context.state.implementedButUnverified) {
    return {
      ok: false,
      message: 'No active autowork chunk is waiting for verification.',
    }
  }

  const validationPlan = resolveAutoworkValidationPlan(activeChunk)
  const validationResults: AutoworkValidationResult[] = []
  const verificationDebts: AutoworkContinuationDebt[] = []

  for (const command of validationPlan.commands) {
    const result = await runAutoworkShellCommand(command.command, context.repoRoot)
    validationResults.push(result)

    if (!result.ok) {
      const validationDebt = createAutoworkContinuationDebt(
        'validation_failed',
        `Validation failed for chunk ${activeChunk.id}: ${command.command}`,
        'validation',
        activeChunk.id,
      )

      if (context.state.runMode === 'dangerous') {
        verificationDebts.push(validationDebt)
        continue
      }

      updateAutoworkState(
        current => ({
          ...current,
          currentMode: 'verification',
          lastValidationResult: result,
          continuationDebt: appendUniqueContinuationDebt(
            current.continuationDebt,
            [validationDebt],
          ),
          stopReason: {
            code: 'validation_failed',
            message: `Validation failed for chunk ${activeChunk.id}: ${command.command}`,
            failedCheck: 'validation',
            chunkId: activeChunk.id,
            capturedAt: Date.now(),
          },
          lastFinishedAt: Date.now(),
          implementedButUnverified: true,
        }),
        context.repoRoot,
      )
      syncAutoworkVerificationBlocked(
        context.repoRoot,
        activeChunk.id,
        `Validation failed for ${activeChunk.id}: ${command.command}`,
      )

      return {
        ok: false,
        message: [
          buildStopMessage(
            'validation_failed',
            `Validation failed for ${activeChunk.id}.`,
            activeChunk.id,
          ),
          '',
          'Validation results:',
          ...formatValidationLines(validationResults),
        ].join('\n'),
      }
    }
  }

  const finalValidationResult =
    validationResults.findLast(result => !result.ok) ??
    validationResults.at(-1) ?? {
      command: 'docs-only',
      ok: true,
      summary: 'No validation command was required for this chunk.',
      checkedAt: Date.now(),
    }

  const beforeHeadSha =
    context.state.lastCommitSha ?? context.state.sourcePlanRevision
  if (!beforeHeadSha) {
    persistAutoworkStop(
      context,
      'missing_pre_chunk_head',
      'Autowork could not determine the pre-chunk HEAD commit.',
      'commit-gate',
      activeChunk.id,
    )
    return {
      ok: false,
      message: buildStopMessage(
        'missing_pre_chunk_head',
        'Autowork could not determine the pre-chunk HEAD commit.',
        activeChunk.id,
      ),
    }
  }

  const postCommit = await verifyAutoworkPostChunkCommit(
    context.repoRoot,
    beforeHeadSha,
  )
  const effectivePostCommitSnapshot = postCommit.snapshot
  if (!postCommit.ok || !effectivePostCommitSnapshot?.headSha) {
    if (
      !postCommit.ok &&
      isAutoworkRelaxableFailureCode(context.state.runMode, postCommit.code) &&
      effectivePostCommitSnapshot?.headSha
    ) {
      verificationDebts.push(
        createAutoworkContinuationDebt(
          postCommit.code,
          postCommit.message,
          'commit-gate',
          activeChunk.id,
        ),
      )
    } else {
      persistAutoworkStop(
        context,
        postCommit.code,
        postCommit.message,
        'commit-gate',
        activeChunk.id,
      )
      return {
        ok: false,
        message: buildStopMessage(postCommit.code, postCommit.message, activeChunk.id),
      }
    }
  }

  const postClean = await verifyAutoworkPostCommitCleanTree(
    context.repoRoot,
    effectivePostCommitSnapshot.headSha,
  )
  if (!postClean.ok) {
    if (isAutoworkRelaxableFailureCode(context.state.runMode, postClean.code)) {
      verificationDebts.push(
        createAutoworkContinuationDebt(
          postClean.code,
          postClean.message,
          'clean-tree',
          activeChunk.id,
        ),
      )
    } else {
      persistAutoworkStop(
        context,
        postClean.code,
        postClean.message,
        'clean-tree',
        activeChunk.id,
      )
      return {
        ok: false,
        message: buildStopMessage(postClean.code, postClean.message, activeChunk.id),
      }
    }
  }

  const completedChunkIds = Array.from(
    new Set([...context.state.completedChunkIds, activeChunk.id]),
  )
  const failedChunkIds = context.state.failedChunkIds.filter(
    chunkId => chunkId !== activeChunk.id,
  )
  const finalContinuationDebt = appendUniqueContinuationDebt(
    context.state.continuationDebt,
    verificationDebts,
  )
  const nextPendingChunkId =
    context.parsedPlan.ok
      ? context.parsedPlan.chunks
          .filter(chunk => chunk.status === 'pending')
          .map(chunk => chunk.id)
          .filter(
            chunkId =>
              !completedChunkIds.includes(chunkId) &&
              !failedChunkIds.includes(chunkId),
          )[0] ?? null
      : null

  const activeWorkflow = peekActiveWorkstream(context.repoRoot)
  const runtimeWindow = resolveAutoworkRuntimeWindow(
    activeWorkflow?.packets.execution ?? null,
  )

  updateAutoworkState(
    current => ({
      ...current,
      sourcePlanPath: context.planPath,
      sourcePlanRevision: postCommit.snapshot.headSha,
      currentChunkId: null,
      completedChunkIds,
      failedChunkIds,
      currentMode: nextPendingChunkId ? 'execution' : 'idle',
      lastStartupInspection: context.inspection,
      lastValidationResult: finalValidationResult,
      lastCommitSha: effectivePostCommitSnapshot.headSha,
      rollbackRef: null,
      continuationDebt: finalContinuationDebt,
      stopReason: null,
      lastFinishedAt: Date.now(),
      implementedButUnverified: false,
    }),
    context.repoRoot,
  )
  syncAutoworkVerificationComplete(
    context.repoRoot,
    activeChunk.id,
    nextPendingChunkId,
    validationResults.length > 0
      ? validationResults.map(result => result.command)
      : [finalValidationResult.command],
    context.state.executionScope === 'plan' &&
      !runtimeWindow.expired &&
      nextPendingChunkId !== null,
  )

  const shouldContinuePlan =
    context.state.executionScope === 'plan' &&
    nextPendingChunkId !== null &&
    !runtimeWindow.expired

  if (
    context.state.runMode === 'dangerous' &&
    finalContinuationDebt.length > 0
  ) {
    const debtSignature = buildTelegramDebtNoticeSignature(
      activeChunk.id,
      finalContinuationDebt,
    )

    if (context.state.lastTelegramNoticeSignature !== debtSignature) {
      void sendAutoworkTelegramDebtNotice({
        repoRoot: context.repoRoot,
        telegramEscalationEnabled: context.state.telegramEscalationEnabled,
        chunkId: activeChunk.id,
        debts: finalContinuationDebt,
        nextPendingChunkId,
      }).then(result => {
        if (result.ok) {
          persistTelegramNoticeSignature(context.repoRoot!, debtSignature)
        }
      })
    }
  }

  return {
    ok: true,
    chunkId: activeChunk.id,
    commitSha: effectivePostCommitSnapshot.headSha,
    nextPendingChunkId,
    message: [
      finalContinuationDebt.length > 0 && context.state.runMode === 'dangerous'
        ? `Chunk ${activeChunk.id} completed in dangerous mode with checkpoint debt.`
        : `Chunk ${activeChunk.id} verified.`,
      '',
      'Validation results:',
      ...formatValidationLines(validationResults.length > 0 ? validationResults : [finalValidationResult]),
      ...(finalContinuationDebt.length > 0
        ? [
            '',
            'Dangerous-mode debt:',
            ...formatContinuationDebtLines(finalContinuationDebt),
          ]
        : []),
      '',
      `Commit: ${effectivePostCommitSnapshot.headSha}`,
      verificationDebts.some(debt => debt.code === 'dirty_worktree_after_commit')
        ? 'Tree: dirty'
        : 'Tree: clean',
      `Next chunk: ${nextPendingChunkId ?? 'none'}`,
      runtimeWindow.expired && nextPendingChunkId
        ? 'Autowork time budget reached its checkpoint boundary. Start a new window to continue the remaining approved work.'
        : null,
      shouldContinuePlan
        ? `Queued next step: /${entryPoint} run`
        : context.state.executionScope === 'step' && nextPendingChunkId
          ? `Step mode complete. Use /${entryPoint} run to continue the approved plan, or /${entryPoint} step to execute only one more chunk.`
          : null,
    ].join('\n'),
    nextInput: shouldContinuePlan ? `/${entryPoint} run` : undefined,
  }
}
