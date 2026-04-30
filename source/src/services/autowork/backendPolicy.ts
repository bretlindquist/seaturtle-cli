import { getResolvedTeammateMode } from '../../utils/swarm/backends/registry.js'
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import type { WorkSwarmBackend } from '../projectIdentity/workflowState.js'
import type { AutoworkExecutionScope, AutoworkMode } from './state.js'
import { resolveAutoworkLifecycleDelegationPolicy } from './delegationPolicy.js'
import {
  resolveAutoworkCloudOffloadCapability,
  type AutoworkCloudOffloadCapability,
} from './cloudOffloadCapability.js'

export type AutoworkBackendTarget =
  | 'main-thread'
  | 'local-swarm'
  | 'cloud-offload'

export type LocalSwarmExecutorMode = 'in-process' | 'tmux'

export type CloudOffloadStatus = 'unavailable' | 'available' | 'active'
export type CloudOffloadRecommendation =
  | 'none'
  | 'optional'
  | 'recommended'
  | 'active'

export type AutoworkCloudAutoLaunchDecision =
  | {
      mode: 'none'
      reason: string | null
    }
  | {
      mode: 'local'
      reason: string
    }
  | {
      mode: 'saved-host'
      host: string
      reason: string
    }
  | {
      mode: 'explicit-host-required'
      reason: string
    }

export type AutoworkLaunchAuthority =
  | { kind: 'continue-local' }
  | { kind: 'blocked'; message: string }
  | { kind: 'launch-cloud-local'; reason: string }
  | { kind: 'launch-cloud-saved-host'; host: string; reason: string }
  | { kind: 'launch-local-swarm' }

export type AutoworkBackendPolicy = {
  target: AutoworkBackendTarget
  swarmBackend: WorkSwarmBackend
  localSwarmEnabled: boolean
  localExecutorMode: LocalSwarmExecutorMode | null
  cloudOffloadStatus: CloudOffloadStatus
  cloudRecommendation: CloudOffloadRecommendation
  cloudPath: AutoworkCloudOffloadCapability['path']
  cloudConfiguredHostCount: number
  cloudReason: string | null
  cloudRecommendationReason: string | null
  cloudNextStep: string | null
  cloudAutoLaunch: AutoworkCloudAutoLaunchDecision
  reason: string
}

type AutoworkBackendPolicyOptions = {
  localSwarmEnabled?: boolean
  localExecutorMode?: LocalSwarmExecutorMode | null
  localSwarmIntegrated?: boolean
  cloudCapability?: AutoworkCloudOffloadCapability
  cloudOffloadActive?: boolean
  heartbeatEnabled?: boolean
  timeBudgetMs?: number | null
  deadlineAt?: number | null
  savedSshHosts?: string[]
}

type AutoworkLaunchAuthorityOptions = {
  executionScope: AutoworkExecutionScope
  timeBudgetMs: number | null
  offloadChild?: boolean
  canLaunchLocalLifecycleSwarm?: boolean
}

function getSavedSshHosts(): string[] {
  return (getInitialSettings().sshConfigs ?? [])
    .map(config => config.sshHost.trim())
    .filter(Boolean)
}

function shouldPreferLocalSwarm(mode: AutoworkMode): boolean {
  switch (mode) {
    case 'discovery':
    case 'research':
    case 'plan-hardening':
    case 'audit-and-polish':
      return true
    case 'execution':
    case 'verification':
    case 'idle':
      return false
  }
}

function isLocalSwarmIntegratedForMode(mode: AutoworkMode): boolean {
  return resolveAutoworkLifecycleDelegationPolicy(mode).mode !== 'none'
}

function getMainThreadReason(mode: AutoworkMode): string {
  switch (mode) {
    case 'discovery':
    case 'research':
    case 'plan-hardening':
    case 'audit-and-polish':
      return 'This lifecycle wave stays on the main thread for authoritative workflow state, even though bounded local swarm sidecars are available.'
    case 'execution':
      return 'Implementation stays on the main thread so edits, validation, and commit gates remain deterministic.'
    case 'verification':
      return 'Verification stays on the main thread so quality gates and final completion claims remain authoritative.'
    case 'idle':
      return 'Autowork is idle, so no swarm backend is selected.'
  }
}

function hasPersistentRuntimeWindow(
  options: AutoworkBackendPolicyOptions,
): boolean {
  return (
    options.heartbeatEnabled === true ||
    options.timeBudgetMs !== null && options.timeBudgetMs !== undefined ||
    options.deadlineAt !== null && options.deadlineAt !== undefined
  )
}

function shouldRecommendCloudOffload(
  mode: AutoworkMode,
  options: AutoworkBackendPolicyOptions,
): boolean {
  if (!hasPersistentRuntimeWindow(options)) {
    return false
  }

  switch (mode) {
    case 'discovery':
    case 'research':
    case 'plan-hardening':
    case 'audit-and-polish':
      return true
    case 'execution':
    case 'verification':
    case 'idle':
      return false
  }
}

function getCloudNextStep(mode: AutoworkMode): string {
  return `Run ct ssh-check --local first, then use ct ssh <host> [dir] to move this ${mode} wave onto the provider-managed remote-host path.`
}

function getCloudRecommendation(
  mode: AutoworkMode,
  cloudCapability: AutoworkCloudOffloadCapability,
  options: AutoworkBackendPolicyOptions,
): Pick<
  AutoworkBackendPolicy,
  'cloudRecommendation' | 'cloudRecommendationReason' | 'cloudNextStep'
> {
  if (cloudCapability.status === 'active') {
    return {
      cloudRecommendation: 'active',
      cloudRecommendationReason:
        'Provider-managed remote-host offload is already the active orchestration path for this run.',
      cloudNextStep: null,
    }
  }

  if (cloudCapability.status !== 'available') {
    return {
      cloudRecommendation: 'none',
      cloudRecommendationReason: null,
      cloudNextStep: null,
    }
  }

  if (shouldRecommendCloudOffload(mode, options)) {
    return {
      cloudRecommendation: 'recommended',
      cloudRecommendationReason:
        `This ${mode} wave has an active heartbeat/runtime window, so provider-managed remote-host offload is the best next path for sustained orchestration.`,
      cloudNextStep: getCloudNextStep(mode),
    }
  }

  if (mode === 'execution' || mode === 'verification') {
    return {
      cloudRecommendation: 'none',
      cloudRecommendationReason:
        'Implementation and verification stay on the main thread so edits, validation, and completion claims remain authoritative.',
      cloudNextStep: null,
    }
  }

  return {
    cloudRecommendation: 'optional',
    cloudRecommendationReason:
      `Provider-managed remote-host offload is ready for this ${mode} wave, but a persistent runtime window is not active yet.`,
    cloudNextStep: getCloudNextStep(mode),
  }
}

function getCloudAutoLaunchDecision(
  mode: AutoworkMode,
  cloudCapability: AutoworkCloudOffloadCapability,
  options: AutoworkBackendPolicyOptions,
): AutoworkCloudAutoLaunchDecision {
  if (cloudCapability.status === 'active') {
    return {
      mode: 'none',
      reason:
        'Cloud offload is already active, so no new cloud launch decision is needed.',
    }
  }

  if (cloudCapability.status !== 'available') {
    return {
      mode: 'none',
      reason: null,
    }
  }

  if (!shouldRecommendCloudOffload(mode, options)) {
    return {
      mode: 'none',
      reason:
        'Cloud auto-launch is reserved for bounded lifecycle waves that need sustained orchestration.',
    }
  }

  const savedSshHosts = options.savedSshHosts ?? getSavedSshHosts()
  if (savedSshHosts.length === 0) {
    return {
      mode: 'local',
      reason:
        'No saved SSH configs are present, so the local provider child is the deterministic cloud offload target for this bounded lifecycle wave.',
    }
  }

  if (savedSshHosts.length === 1) {
    return {
      mode: 'saved-host',
      host: savedSshHosts[0]!,
      reason:
        'Exactly one saved SSH config is present, so SeaTurtle can offload this bounded lifecycle wave without guessing the remote host.',
    }
  }

  return {
    mode: 'explicit-host-required',
    reason:
      'Multiple saved SSH configs are present, so SeaTurtle requires an explicit host choice before auto-offloading this bounded lifecycle wave.',
  }
}

export function resolveAutoworkBackendPolicy(
  mode: AutoworkMode,
  options: AutoworkBackendPolicyOptions = {},
): AutoworkBackendPolicy {
  const localSwarmEnabled =
    options.localSwarmEnabled ?? isAgentSwarmsEnabled()
  const localExecutorMode =
    options.localExecutorMode ??
    (localSwarmEnabled ? getResolvedTeammateMode() : null)
  const localSwarmIntegrated =
    options.localSwarmIntegrated ?? isLocalSwarmIntegratedForMode(mode)
  const cloudCapability =
    options.cloudCapability ??
    resolveAutoworkCloudOffloadCapability({
      active: options.cloudOffloadActive,
    })
  const cloudRecommendation = getCloudRecommendation(
    mode,
    cloudCapability,
    options,
  )
  const cloudAutoLaunch = getCloudAutoLaunchDecision(
    mode,
    cloudCapability,
    options,
  )

  if (cloudCapability.status === 'active') {
    return {
      target: 'cloud-offload',
      swarmBackend: 'cloud',
      localSwarmEnabled,
      localExecutorMode,
      cloudOffloadStatus: cloudCapability.status,
      cloudRecommendation: cloudRecommendation.cloudRecommendation,
      cloudPath: cloudCapability.path,
      cloudConfiguredHostCount: cloudCapability.configuredHostCount,
      cloudReason: cloudCapability.reason,
      cloudRecommendationReason: cloudRecommendation.cloudRecommendationReason,
      cloudNextStep: cloudRecommendation.cloudNextStep,
      cloudAutoLaunch,
      reason:
        'Cloud offload is currently active, so autowork should report the remote-host execution path as authoritative.',
    }
  }

  if (
    localSwarmIntegrated &&
    shouldPreferLocalSwarm(mode) &&
    localSwarmEnabled &&
    localExecutorMode === 'in-process'
  ) {
    return {
      target: 'local-swarm',
      swarmBackend: 'local',
      localSwarmEnabled: true,
      localExecutorMode,
      cloudOffloadStatus: cloudCapability.status,
      cloudRecommendation: cloudRecommendation.cloudRecommendation,
      cloudPath: cloudCapability.path,
      cloudConfiguredHostCount: cloudCapability.configuredHostCount,
      cloudReason: cloudCapability.reason,
      cloudRecommendationReason: cloudRecommendation.cloudRecommendationReason,
      cloudNextStep: cloudRecommendation.cloudNextStep,
      cloudAutoLaunch,
      reason: `This ${mode} wave can use the supervised local swarm path (${localExecutorMode}) without moving orchestration truth off the machine.`,
    }
  }

  return {
    target: 'main-thread',
    swarmBackend: 'none',
    localSwarmEnabled,
    localExecutorMode,
    cloudOffloadStatus: cloudCapability.status,
    cloudRecommendation: cloudRecommendation.cloudRecommendation,
    cloudPath: cloudCapability.path,
    cloudConfiguredHostCount: cloudCapability.configuredHostCount,
    cloudReason: cloudCapability.reason,
    cloudRecommendationReason: cloudRecommendation.cloudRecommendationReason,
    cloudNextStep: cloudRecommendation.cloudNextStep,
    cloudAutoLaunch,
    reason: getMainThreadReason(mode),
  }
}

export function formatRequestedTimeBudget(timeBudgetMs: number): string {
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (timeBudgetMs % day === 0) {
    return `${timeBudgetMs / day}d`
  }
  if (timeBudgetMs % hour === 0) {
    return `${timeBudgetMs / hour}h`
  }
  return `${Math.max(1, Math.round(timeBudgetMs / minute))}m`
}

export function resolveAutoworkLaunchAuthority(
  mode: AutoworkMode,
  backendPolicy: AutoworkBackendPolicy,
  options: AutoworkLaunchAuthorityOptions,
): AutoworkLaunchAuthority {
  if (options.offloadChild === true) {
    return { kind: 'continue-local' }
  }

  const hasBoundedPlanRun =
    options.executionScope === 'plan' && options.timeBudgetMs !== null

  if (hasBoundedPlanRun) {
    switch (backendPolicy.cloudAutoLaunch.mode) {
      case 'local':
        return {
          kind: 'launch-cloud-local',
          reason: backendPolicy.cloudAutoLaunch.reason,
        }
      case 'saved-host':
        return {
          kind: 'launch-cloud-saved-host',
          host: backendPolicy.cloudAutoLaunch.host,
          reason: backendPolicy.cloudAutoLaunch.reason,
        }
      case 'explicit-host-required':
        return {
          kind: 'blocked',
          message: [
            `Autowork should move this bounded ${mode} wave onto cloud offload, but the host choice is ambiguous.`,
            '',
            backendPolicy.cloudAutoLaunch.reason,
            '',
            `Next: use /autowork cloud <ssh-host> run ${formatRequestedTimeBudget(options.timeBudgetMs)} to choose one explicitly.`,
          ].join('\n'),
        }
      case 'none':
        break
    }
  }

  if (options.canLaunchLocalLifecycleSwarm === true) {
    return { kind: 'launch-local-swarm' }
  }

  return { kind: 'continue-local' }
}
