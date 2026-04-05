import { basename, dirname, resolve } from 'path'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { findCanonicalGitRoot, gitExe } from '../../utils/git.js'
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
import { sendAutoworkTelegramStopNotice } from './telegramAlerts.js'
import {
  readAutoworkState,
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

const AUTOWORK_BASH_TIMEOUT_MS = 30 * 60 * 1000

export type AutoworkEntryPoint = 'autowork' | 'swim'

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
  planPath: string
  state: AutoworkState
  runPolicy: AutoworkRunPolicy
  inspection: AutoworkStartupInspection
  parsedPlan: AutoworkPlanParseResult
  eligibility: AutoworkEligibilityResult
  mode: AutoworkMode
  modeReason: string
  nextPendingChunkId: string | null
}

export type AutoworkSafeExecutionLaunch =
  | {
      ok: true
      repoRoot: string
      planPath: string
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

function buildAutoworkExecutionPrompt(
  entryPoint: AutoworkEntryPoint,
  repoRoot: string,
  planPath: string,
  chunk: AutoworkPlanChunk,
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
    'Execute exactly one chunk and stop.',
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

  const shouldNotify =
    !context.state.stopReason ||
    context.state.stopReason.code !== code ||
    context.state.stopReason.message !== message ||
    context.state.stopReason.chunkId !== chunkId

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

  if (shouldNotify) {
    void sendAutoworkTelegramStopNotice({
      repoRoot: context.repoRoot,
      telegramEscalationEnabled,
      code,
      message,
      failedCheck,
      chunkId,
    })
  }
}

export async function inspectAndSelectAutoworkMode(
  planPath: string,
): Promise<AutoworkStartupContext> {
  const resolvedPlanPath = resolve(planPath)
  const repoRoot = findCanonicalGitRoot(dirname(resolvedPlanPath))
  const state = readAutoworkState(repoRoot ?? undefined)

  const [branch, gitStatusShort, latestRelevantCommits, parsedPlan, eligibility, hygiene] =
    repoRoot
      ? await Promise.all([
          getCurrentBranch(repoRoot),
          getGitStatusShortLines(repoRoot),
          getLatestRelevantCommits(repoRoot),
          parseAutoworkPlanFile(resolvedPlanPath),
          assessAutoworkEligibility(resolvedPlanPath, state.runMode),
          assessAutoworkHygiene(repoRoot),
        ])
      : [
          null,
          [],
          [],
          ({
            ok: false,
            path: resolvedPlanPath,
            code: 'plan_not_in_git_repo',
            message: 'Autowork plan file must live inside a git repository.',
          } as const),
          ({
            ok: false,
            code: 'not_in_git_repo',
            message: 'Autowork requires a git repository before it can start.',
            failedCheck: 'git-repo',
            repoRoot: null,
            planPath: resolvedPlanPath,
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

  const decision = selectAutoworkMode(inspection, state, parsedPlan)

  return {
    repoRoot,
    planPath: resolvedPlanPath,
    state,
    runPolicy: getAutoworkRunPolicy(state.runMode),
    inspection,
    parsedPlan,
    eligibility,
    mode: decision.mode,
    modeReason: decision.reason,
    nextPendingChunkId: decision.nextPendingChunkId,
  }
}

export async function prepareAutoworkSafeExecution(
  planPath: string,
  entryPoint: AutoworkEntryPoint,
): Promise<AutoworkSafeExecutionLaunch> {
  const context = await inspectAndSelectAutoworkMode(planPath)
  if (!context.repoRoot) {
    return { ok: false, message: 'Autowork requires a git repository.' }
  }

  if (!context.eligibility.ok) {
    persistAutoworkStop(
      context,
      context.eligibility.code,
      context.eligibility.message,
      context.eligibility.failedCheck,
    )
    return { ok: false, message: context.eligibility.message }
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

  const prompt = buildAutoworkExecutionPrompt(
    entryPoint,
    context.repoRoot,
    context.planPath,
    nextChunk,
  )
  const nextRunCount = context.state.runCount + 1
  const visibleMessage = [
    '',
    `Launching ${nextChunk.id}.`,
    `Plan: ${context.planPath}`,
    context.state.runMode === 'dangerous' && launchDebts.length > 0
      ? 'Dangerous-mode debt at launch:'
      : null,
    ...(context.state.runMode === 'dangerous'
      ? formatContinuationDebtLines(launchDebts)
      : []),
    `Queued next step: /${entryPoint} verify`,
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
      continuationDebt: appendUniqueContinuationDebt([], launchDebts),
      stopReason: null,
      lastStartedAt: Date.now(),
      implementedButUnverified: true,
      runCount: nextRunCount,
    }),
    context.repoRoot,
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
): Promise<AutoworkVerificationResult> {
  const context = await inspectAndSelectAutoworkMode(planPath)
  if (!context.repoRoot) {
    return { ok: false, message: 'Autowork requires a git repository.' }
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
    ].join('\n'),
  }
}
