import { getResolvedTeammateMode } from '../../utils/swarm/backends/registry.js'
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js'
import type { WorkSwarmBackend } from '../projectIdentity/workflowState.js'
import type { AutoworkMode } from './state.js'

export type AutoworkBackendTarget =
  | 'main-thread'
  | 'local-swarm'
  | 'cloud-swarm'

export type LocalSwarmExecutorMode = 'in-process' | 'tmux'

export type CloudSwarmStatus = 'unavailable' | 'idle' | 'active'

export type AutoworkBackendPolicy = {
  target: AutoworkBackendTarget
  swarmBackend: WorkSwarmBackend
  localSwarmEnabled: boolean
  localExecutorMode: LocalSwarmExecutorMode | null
  cloudSwarmStatus: CloudSwarmStatus
  cloudReason: string | null
  reason: string
}

type AutoworkBackendPolicyOptions = {
  localSwarmEnabled?: boolean
  localExecutorMode?: LocalSwarmExecutorMode | null
  cloudSwarmStatus?: CloudSwarmStatus
  cloudReason?: string | null
}

const CLOUD_SWARM_UNAVAILABLE_REASON =
  'Cloud swarm is not implemented in SeaTurtle yet, so autowork must stay on local execution paths.'

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
    case 'execution':
      return 'Implementation stays on the main thread so edits, validation, and commit gates remain deterministic.'
    case 'verification':
      return 'Verification stays on the main thread so quality gates and final completion claims remain authoritative.'
    case 'idle':
      return 'Autowork is idle, so no swarm backend is selected.'
    default:
      return 'Local swarm is unavailable for this session, so autowork remains on the main thread.'
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
  const cloudSwarmStatus = options.cloudSwarmStatus ?? 'unavailable'
  const cloudReason =
    options.cloudReason ?? CLOUD_SWARM_UNAVAILABLE_REASON

  if (
    shouldPreferLocalSwarm(mode) &&
    localSwarmEnabled &&
    localExecutorMode !== null
  ) {
    return {
      target: 'local-swarm',
      swarmBackend: 'local',
      localSwarmEnabled: true,
      localExecutorMode,
      cloudSwarmStatus,
      cloudReason,
      reason: `This ${mode} wave can use the local swarm path (${localExecutorMode}) without moving orchestration truth off the main thread.`,
    }
  }

  return {
    target: 'main-thread',
    swarmBackend: 'none',
    localSwarmEnabled,
    localExecutorMode,
    cloudSwarmStatus,
    cloudReason,
    reason: getMainThreadReason(mode),
  }
}

