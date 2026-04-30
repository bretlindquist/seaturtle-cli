import {
  DEFAULT_AUTOWORK_HEARTBEAT_INTERVAL_MS,
  formatAutoworkRuntimeWindowLabel,
} from './runtimeWindow.js'
import type { AutoworkBackendPolicy } from './backendPolicy.js'
import { resolveAutoworkBackendPolicy } from './backendPolicy.js'
import { getAutoworkLaunchQuip } from './quips.js'
import {
  inspectAndSelectAutoworkMode,
  type AutoworkStartupContext,
} from './runner.js'
import {
  resolveActiveAutoworkPlanFile,
  type AutoworkPlanResolutionResult,
} from './planResolution.js'
import { resolveAutoworkLifecycleDelegationPolicy } from './delegationPolicy.js'
import { peekActiveWorkstream } from '../projectIdentity/workflowState.js'
import { formatDuration } from '../../utils/format.js'

export type AutoworkInspectionEntryPoint = 'autowork' | 'swim'
type AutoworkInspectionPolicyMode = 'default' | 'early-startup'

function titleCaseRunMode(runMode: AutoworkStartupContext['state']['runMode']): string {
  return runMode === 'dangerous' ? 'dangerous' : 'safe'
}

function formatExecutionScope(
  scope: AutoworkStartupContext['state']['executionScope'],
): string {
  return scope === 'step' ? 'one chunk only' : 'plan to completion'
}

function formatPlanResolutionSource(
  source:
    | Extract<AutoworkPlanResolutionResult, { ok: true }>['source']
    | 'workflow-bootstrap',
): string {
  switch (source) {
    case 'selected-path':
      return 'explicit selection'
    case 'workflow-state':
      return 'workflow state'
    case 'state':
      return 'persisted autowork state'
    case 'tracked-root':
      return 'single tracked root-level fallback'
    case 'workflow-bootstrap':
      return 'workflow bootstrap'
  }
}

function formatWorkflowEligibilityHint(
  hint: NonNullable<
    AutoworkStartupContext['workflowResolution']
  >['autoworkEligibilityHint'],
): string {
  switch (hint) {
    case 'no-active-workstream':
      return 'no active workstream'
    case 'intent-needed':
      return 'intent needed'
    case 'research-needed':
      return 'research needed'
    case 'plan-needed':
      return 'plan needed'
    case 'implementation-ready':
      return 'implementation ready'
    case 'verification-needed':
      return 'verification needed'
    case 'review-needed':
      return 'review needed'
    case 'state-conflict':
      return 'state conflict'
  }
}

function formatBackendTarget(policy: AutoworkBackendPolicy): string {
  switch (policy.target) {
    case 'main-thread':
      return 'main thread'
    case 'local-swarm':
      return policy.localExecutorMode
        ? `local swarm (${policy.localExecutorMode})`
        : 'local swarm'
    case 'cloud-offload':
      return 'cloud offload'
  }
}

function formatActualExecutionPath(
  context: AutoworkStartupContext,
): string {
  const execution = context.repoRoot
    ? peekActiveWorkstream(context.repoRoot)?.packets.execution ?? null
    : null

  if (execution?.swarmBackend === 'cloud' && execution.swarmActive) {
    return 'cloud offload'
  }

  if (execution?.swarmBackend === 'local' && execution.swarmActive) {
    return execution.swarmWorkerCount > 0
      ? `local swarm (${execution.swarmWorkerCount} worker${execution.swarmWorkerCount === 1 ? '' : 's'})`
      : 'local swarm'
  }

  return 'main thread'
}

function formatCloudOffloadStatus(policy: AutoworkBackendPolicy): string {
  switch (policy.cloudOffloadStatus) {
    case 'active':
      return 'active'
    case 'available':
      return policy.cloudConfiguredHostCount > 0
        ? `available via ct ssh (${policy.cloudConfiguredHostCount} saved host${policy.cloudConfiguredHostCount === 1 ? '' : 's'})`
        : 'available via ct ssh'
    case 'unavailable':
      return policy.cloudReason ?? 'unavailable'
  }
}

function formatCloudRecommendation(policy: AutoworkBackendPolicy): string {
  switch (policy.cloudRecommendation) {
    case 'active':
      return 'active'
    case 'recommended':
      return 'recommended'
    case 'optional':
      return 'optional'
    case 'none':
      return policy.cloudOffloadStatus === 'unavailable'
        ? 'unavailable'
        : 'not recommended'
  }
}

function formatCloudAutoLaunch(policy: AutoworkBackendPolicy): string {
  switch (policy.cloudAutoLaunch.mode) {
    case 'local':
      return 'auto -> local provider child'
    case 'saved-host':
      return `auto -> ${policy.cloudAutoLaunch.host}`
    case 'explicit-host-required':
      return 'explicit host required'
    case 'none':
      return policy.cloudRecommendation === 'active' ? 'already active' : 'off'
  }
}

function formatLifecycleDelegation(
  context: AutoworkStartupContext,
): string {
  const policy = resolveAutoworkLifecycleDelegationPolicy(context.mode)
  if (policy.mode === 'none') {
    return 'main thread only'
  }

  return `bounded agent sidecars via ${policy.toolName ?? 'agent tooling'}`
}

function resolveBackendPolicyForContext(
  context: AutoworkStartupContext,
  policyMode: AutoworkInspectionPolicyMode = 'default',
): AutoworkBackendPolicy {
  const execution = context.repoRoot
    ? peekActiveWorkstream(context.repoRoot)?.packets.execution ?? null
    : null

  if (policyMode === 'early-startup') {
    return resolveAutoworkBackendPolicy(context.mode, {
      localSwarmEnabled: false,
      localExecutorMode: null,
      cloudCapability: {
        status: 'unavailable',
        active: false,
        path: 'none',
        configuredHostCount: 0,
        reason:
          'Cloud offload capability is resolved only after full runtime startup.',
      },
      heartbeatEnabled: execution?.heartbeatEnabled,
      timeBudgetMs: execution?.timeBudgetMs,
      deadlineAt: execution?.deadlineAt,
      cloudOffloadActive:
        execution?.swarmBackend === 'cloud' && execution?.swarmActive === true,
    })
  }

  return resolveAutoworkBackendPolicy(context.mode, {
    heartbeatEnabled: execution?.heartbeatEnabled,
    timeBudgetMs: execution?.timeBudgetMs,
    deadlineAt: execution?.deadlineAt,
    cloudOffloadActive:
      execution?.swarmBackend === 'cloud' && execution?.swarmActive === true,
  })
}

function formatChecks(
  context: AutoworkStartupContext,
  doctor: boolean,
): string[] {
  return context.eligibility.checks.map(check =>
    doctor
      ? `- ${check.name}: ${check.ok ? 'ok' : 'failed'} - ${check.summary}`
      : `- ${check.name}: ${check.ok ? 'ok' : 'failed'}`,
  )
}

export async function resolveAutoworkInspectionContext(
  entryPoint: AutoworkInspectionEntryPoint,
): Promise<
  | {
      ok: true
      context: AutoworkStartupContext
      planSource:
        | Extract<AutoworkPlanResolutionResult, { ok: true }>['source']
        | 'workflow-bootstrap'
    }
  | { ok: false; message: string }
> {
  const resolved = await resolveActiveAutoworkPlanFile()
  if (!resolved.ok) {
    const workflowBootstrapContext = await inspectAndSelectAutoworkMode(null)
    if (
      workflowBootstrapContext.repoRoot &&
      workflowBootstrapContext.mode !== 'execution'
    ) {
      return {
        ok: true,
        context: workflowBootstrapContext,
        planSource: 'workflow-bootstrap',
      }
    }

    const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
    return {
      ok: false,
      message: [
        resolved.message,
        '',
        resolved.candidates.length > 0
          ? [
              `Candidates:\n${resolved.candidates.map(candidate => `- ${candidate}`).join('\n')}`,
              '',
              `Next: pin one explicitly with ${baseName} use <path>.`,
            ].join('\n')
          : [
              'Next:',
              '- create a tracked dated plan file like `2026-04-05-feature-name-state.md`',
              `- or pin one explicitly with ${baseName} use <path>`,
            ].join('\n'),
        '',
        `Then rerun ${baseName} status or ${baseName} doctor.`,
      ].join('\n'),
    }
  }

  return {
    ok: true,
    context: await inspectAndSelectAutoworkMode(resolved.planPath),
    planSource: resolved.source,
  }
}

export function formatAutoworkStatusSummary(
  entryPoint: AutoworkInspectionEntryPoint,
  context: AutoworkStartupContext,
  planSource:
    | Extract<AutoworkPlanResolutionResult, { ok: true }>['source']
    | 'workflow-bootstrap',
  policyMode: AutoworkInspectionPolicyMode = 'default',
): string {
  const execution = context.repoRoot
    ? peekActiveWorkstream(context.repoRoot)?.packets.execution ?? null
    : null
  const workflowResolution = context.workflowResolution
  const backendPolicy = resolveBackendPolicyForContext(context, policyMode)
  const quip = getAutoworkLaunchQuip(
    entryPoint,
    `${context.planPath}:${context.mode}:${context.nextPendingChunkId ?? 'none'}`,
  )

  return [
    quip,
    '',
    `Mode: ${context.mode}`,
    `Why: ${context.modeReason}`,
    `Plan: ${context.planPath ?? 'none yet'}`,
    `Plan source: ${formatPlanResolutionSource(planSource)}`,
    workflowResolution
      ? `Workflow phase: ${workflowResolution.phase}`
      : 'Workflow phase: unavailable',
    workflowResolution
      ? `Workflow readiness: ${formatWorkflowEligibilityHint(workflowResolution.autoworkEligibilityHint)}`
      : 'Workflow readiness: unavailable',
    `Run mode: ${titleCaseRunMode(context.state.runMode)}`,
    `Execution scope: ${formatExecutionScope(context.state.executionScope)}`,
    `Autowork window: ${formatAutoworkRuntimeWindowLabel(execution)}`,
    `Heartbeat: ${execution?.heartbeatEnabled ? `on (${formatDuration(execution.heartbeatIntervalMs ?? DEFAULT_AUTOWORK_HEARTBEAT_INTERVAL_MS, { hideTrailingZeros: true, mostSignificantOnly: true })})` : 'off'}`,
    `Execution path: ${formatActualExecutionPath(context)}`,
    `Backend policy: ${formatBackendTarget(backendPolicy)}`,
    `Cloud offload: ${formatCloudOffloadStatus(backendPolicy)}`,
    `Cloud recommendation: ${formatCloudRecommendation(backendPolicy)}`,
    `Cloud auto-launch: ${formatCloudAutoLaunch(backendPolicy)}`,
    `Lifecycle delegation: ${formatLifecycleDelegation(context)}`,
    `Next chunk: ${context.nextPendingChunkId ?? 'none'}`,
    `Validation known: ${context.inspection.validationKnownForLastChunk ? 'yes' : 'no'}`,
    `Ignore hygiene: ${context.inspection.ignoreHygieneOk ? 'healthy' : 'needs work'}`,
    '',
    'Current readiness:',
    ...formatChecks(context, false),
    '',
    context.mode === 'execution'
      ? `Next: use /${entryPoint} run to continue the approved plan from ${context.nextPendingChunkId ?? 'the next chunk'}, or /${entryPoint} step to execute only one chunk.`
      : context.mode === 'verification'
        ? `Next: use /${entryPoint} verify to enforce the checkpoint for ${context.state.currentChunkId ?? 'the active chunk'}.`
        : context.mode === 'research' ||
            context.mode === 'plan-hardening' ||
            context.mode === 'audit-and-polish' ||
            context.mode === 'discovery'
          ? `Next: use /${entryPoint} run to continue the current ${context.mode} wave from workflow state.`
          : `Next: use /${entryPoint} doctor for the fuller checkpoint breakdown.`,
  ].join('\n')
}

export function formatAutoworkDoctorSummary(
  context: AutoworkStartupContext,
  planSource:
    | Extract<AutoworkPlanResolutionResult, { ok: true }>['source']
    | 'workflow-bootstrap',
  policyMode: AutoworkInspectionPolicyMode = 'default',
): string {
  const execution = context.repoRoot
    ? peekActiveWorkstream(context.repoRoot)?.packets.execution ?? null
    : null
  const workflowResolution = context.workflowResolution
  const backendPolicy = resolveBackendPolicyForContext(context, policyMode)
  const delegationPolicy = resolveAutoworkLifecycleDelegationPolicy(context.mode)
  const lines = [
    'Autowork doctor',
    '',
    `Plan: ${context.planPath ?? 'none yet'}`,
    `Plan source: ${formatPlanResolutionSource(planSource)}`,
    `Repo root: ${context.repoRoot ?? 'not in git repo'}`,
    `Workflow phase: ${workflowResolution?.phase ?? 'unavailable'}`,
    `Workflow readiness: ${workflowResolution ? formatWorkflowEligibilityHint(workflowResolution.autoworkEligibilityHint) : 'unavailable'}`,
    `Run mode: ${titleCaseRunMode(context.state.runMode)}`,
    `Execution scope: ${formatExecutionScope(context.state.executionScope)}`,
    `Autowork window: ${formatAutoworkRuntimeWindowLabel(execution)}`,
    `Heartbeat: ${execution?.heartbeatEnabled ? `on (${formatDuration(execution.heartbeatIntervalMs ?? DEFAULT_AUTOWORK_HEARTBEAT_INTERVAL_MS, { hideTrailingZeros: true, mostSignificantOnly: true })})` : 'off'}`,
    `Execution path: ${formatActualExecutionPath(context)}`,
    `Backend policy: ${formatBackendTarget(backendPolicy)}`,
    `Cloud offload: ${formatCloudOffloadStatus(backendPolicy)}`,
    `Cloud recommendation: ${formatCloudRecommendation(backendPolicy)}`,
    `Cloud auto-launch: ${formatCloudAutoLaunch(backendPolicy)}`,
    `Lifecycle delegation: ${formatLifecycleDelegation(context)}`,
    `Selected mode: ${context.mode}`,
    `Reason: ${context.modeReason}`,
    `Current branch: ${context.inspection.branch ?? 'unknown'}`,
    `Uncommitted changes: ${context.inspection.hasUncommittedChanges ? 'yes' : 'no'}`,
    `Executable plan available: ${context.inspection.hasExecutablePlanFile ? 'yes' : 'no'}`,
    `Recently completed unverified chunk: ${context.inspection.hasRecentlyCompletedUnverifiedChunk ? 'yes' : 'no'}`,
    `Validation known for last chunk: ${context.inspection.validationKnownForLastChunk ? 'yes' : 'no'}`,
    `Ignore hygiene ok: ${context.inspection.ignoreHygieneOk ? 'yes' : 'no'}`,
    '',
    'Eligibility checks:',
    ...formatChecks(context, true),
  ]

  lines.push('', `Backend policy: ${backendPolicy.reason}`)

  if (backendPolicy.cloudRecommendationReason) {
    lines.push(`Cloud policy: ${backendPolicy.cloudRecommendationReason}`)
  }

  if (backendPolicy.cloudNextStep) {
    lines.push(`Cloud next step: ${backendPolicy.cloudNextStep}`)
  }

  if (backendPolicy.cloudAutoLaunch.reason) {
    lines.push(`Cloud launch policy: ${backendPolicy.cloudAutoLaunch.reason}`)
  }

  if (delegationPolicy.mode !== 'none') {
    lines.push(
      `Lifecycle delegation policy: ${delegationPolicy.summary}`,
      'Lifecycle delegated work:',
      ...delegationPolicy.allowedWork.map(work => `- ${work}`),
      'Lifecycle delegation constraints:',
      ...delegationPolicy.constraints.map(constraint => `- ${constraint}`),
    )
  }

  if (workflowResolution?.issues.length) {
    lines.push(
      '',
      'Workflow issues:',
      ...workflowResolution.issues.map(issue => `- ${issue}`),
    )
  }

  if (!context.eligibility.ok && context.eligibility.parseFailure) {
    lines.push(
      '',
      `Plan parse failure: ${context.eligibility.parseFailure.code}`,
      context.eligibility.parseFailure.message,
    )
  }

  if (context.inspection.latestRelevantCommits.length > 0) {
    lines.push(
      '',
      'Latest commits:',
      ...context.inspection.latestRelevantCommits.map(line => `- ${line}`),
    )
  }

  if (context.inspection.gitStatusShort.length > 0) {
    lines.push(
      '',
      'git status --short:',
      ...context.inspection.gitStatusShort.map(line => `- ${line}`),
    )
  }

  return lines.join('\n')
}

export async function inspectAutoworkHeadless(
  entryPoint: AutoworkInspectionEntryPoint,
  action: 'status' | 'doctor',
  options?: {
    policyMode?: AutoworkInspectionPolicyMode
  },
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const resolved = await resolveAutoworkInspectionContext(entryPoint)
  if (!resolved.ok) {
    return resolved
  }

  return {
    ok: true,
    message:
      action === 'doctor'
        ? formatAutoworkDoctorSummary(
            resolved.context,
            resolved.planSource,
            options?.policyMode,
          )
        : formatAutoworkStatusSummary(
            entryPoint,
            resolved.context,
            resolved.planSource,
            options?.policyMode,
          ),
  }
}
