import { getResolvedTeammateMode } from '../../utils/swarm/backends/registry.js'
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import type { WorkSwarmBackend } from '../projectIdentity/workflowState.js'
import type { AutoworkMode } from './state.js'
import {
  resolveAutoworkCloudOffloadCapability,
  type AutoworkCloudOffloadCapability,
} from './cloudOffloadCapability.js'

export type AutoworkBackendTarget =
  | 'main-thread'
  | 'local-swarm'
  | 'cloud-offload'

export type LocalSwarmExecutorMode = 'in-process' | 'tmux'

export type CloudSwarmStatus = 'unavailable' | 'available' | 'active'
export type CloudSwarmRecommendation =
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

export type AutoworkBackendPolicy = {
  target: AutoworkBackendTarget
  swarmBackend: WorkSwarmBackend
  localSwarmEnabled: boolean
  localExecutorMode: LocalSwarmExecutorMode | null
  cloudSwarmStatus: CloudSwarmStatus
  cloudRecommendation: CloudSwarmRecommendation
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

function getMainThreadReason(mode: AutoworkMode): string {
  switch (mode) {
    case 'discovery':
    case 'research':
    case 'plan-hardening':
    case 'audit-and-polish':
      return 'Local swarm is not yet wired into the autowork scheduler, so this wave remains on the main thread.'
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
  const localSwarmIntegrated = options.localSwarmIntegrated ?? false
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
      cloudSwarmStatus: cloudCapability.status,
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
    localExecutorMode !== null
  ) {
    return {
      target: 'local-swarm',
      swarmBackend: 'local',
      localSwarmEnabled: true,
      localExecutorMode,
      cloudSwarmStatus: cloudCapability.status,
      cloudRecommendation: cloudRecommendation.cloudRecommendation,
      cloudPath: cloudCapability.path,
      cloudConfiguredHostCount: cloudCapability.configuredHostCount,
      cloudReason: cloudCapability.reason,
      cloudRecommendationReason: cloudRecommendation.cloudRecommendationReason,
      cloudNextStep: cloudRecommendation.cloudNextStep,
      cloudAutoLaunch,
      reason: `This ${mode} wave can use the local swarm path (${localExecutorMode}) without moving orchestration truth off the main thread.`,
    }
  }

  return {
    target: 'main-thread',
    swarmBackend: 'none',
    localSwarmEnabled,
    localExecutorMode,
    cloudSwarmStatus: cloudCapability.status,
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
