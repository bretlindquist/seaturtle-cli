import type { SetAppState } from '../../Task.js'
import { syncWorkflowRuntimeState } from '../../state/workflowRuntimeState.js'
import {
  updateWorkExecutionPacket,
  type WorkExecutionPacket,
  type WorkSwarmBackend,
} from '../projectIdentity/workflowState.js'

export type AutoworkExecutionAuthorityProjection = {
  backend: WorkSwarmBackend
  active: boolean
  workerCount?: number | null
  statusText?: string | null
  lastActivityAt?: number | null
}

function normalizeExecutionAuthority(
  options: AutoworkExecutionAuthorityProjection,
): {
  swarmBackend: WorkSwarmBackend
  swarmActive: boolean
  swarmWorkerCount: number
  statusText?: string | null
  lastActivityAt: number
} {
  const swarmActive = options.active
  const swarmBackend = swarmActive ? options.backend : 'none'
  const defaultWorkerCount =
    swarmActive && options.backend !== 'none' ? 1 : 0
  return {
    swarmBackend,
    swarmActive,
    swarmWorkerCount: swarmActive
      ? Math.max(0, options.workerCount ?? defaultWorkerCount)
      : 0,
    statusText: options.statusText,
    lastActivityAt: options.lastActivityAt ?? Date.now(),
  }
}

export function projectAutoworkExecutionAuthority(
  current: WorkExecutionPacket,
  options: AutoworkExecutionAuthorityProjection,
): WorkExecutionPacket {
  const normalized = normalizeExecutionAuthority(options)
  return {
    ...current,
    swarmBackend: normalized.swarmBackend,
    swarmActive: normalized.swarmActive,
    swarmWorkerCount: normalized.swarmWorkerCount,
    statusText: normalized.statusText ?? current.statusText,
    lastActivityAt: normalized.lastActivityAt,
  }
}

export function syncAutoworkExecutionAuthority(
  root: string,
  setAppState: SetAppState,
  options: AutoworkExecutionAuthorityProjection,
): WorkExecutionPacket {
  const next = updateWorkExecutionPacket(
    current => projectAutoworkExecutionAuthority(current, options),
    root,
  )
  syncWorkflowRuntimeState(root, setAppState)
  return next
}
