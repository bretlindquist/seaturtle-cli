import {
  type WorkExecutionScope,
  type WorkPhase,
  type WorkSwarmBackend,
  peekActiveWorkstream,
} from './workflowState.js'
import { type AutoworkMode, peekAutoworkState } from '../autowork/state.js'

export type WorkflowRuntimeSnapshot = {
  version: 1
  workId: string | null
  workflowPhase: WorkPhase
  autoworkMode: AutoworkMode
  autoworkActive: boolean
  activeChunkId: string | null
  executionScope: WorkExecutionScope
  timeBudgetMs: number | null
  deadlineAt: number | null
  heartbeatEnabled: boolean
  heartbeatIntervalMs: number | null
  swarmBackend: WorkSwarmBackend
  swarmActive: boolean
  swarmWorkerCount: number
  statusText: string | null
  lastActivityAt: number | null
}

export function createDefaultWorkflowRuntimeSnapshot(): WorkflowRuntimeSnapshot {
  return {
    version: 1,
    workId: null,
    workflowPhase: 'idle',
    autoworkMode: 'idle',
    autoworkActive: false,
    activeChunkId: null,
    executionScope: 'none',
    timeBudgetMs: null,
    deadlineAt: null,
    heartbeatEnabled: false,
    heartbeatIntervalMs: null,
    swarmBackend: 'none',
    swarmActive: false,
    swarmWorkerCount: 0,
    statusText: null,
    lastActivityAt: null,
  }
}

function isAutoworkActivelyRunning(
  autowork:
    | ReturnType<typeof peekAutoworkState>
    | null,
): boolean {
  if (!autowork) {
    return false
  }

  if (autowork.currentChunkId || autowork.implementedButUnverified) {
    return true
  }

  if (autowork.currentMode === 'verification') {
    return true
  }

  if (autowork.lastStartedAt === null) {
    return false
  }

  return (
    autowork.lastFinishedAt === null ||
    autowork.lastStartedAt > autowork.lastFinishedAt
  )
}

export function readWorkflowRuntimeSnapshot(
  root: string,
): WorkflowRuntimeSnapshot {
  const defaults = createDefaultWorkflowRuntimeSnapshot()
  const workflow = peekActiveWorkstream(root)
  const autowork = peekAutoworkState(root)

  if (!workflow && !autowork) {
    return defaults
  }

  const execution = workflow?.packets.execution
  const lastActivityAt =
    execution?.lastActivityAt ??
    execution?.updatedAt ??
    autowork?.lastStartedAt ??
    autowork?.lastFinishedAt ??
    null

  return {
    version: 1,
    workId: workflow?.resolution.workId ?? execution?.workId ?? null,
    workflowPhase: workflow?.resolution.phase ?? execution?.phase ?? 'idle',
    autoworkMode: autowork?.currentMode ?? 'idle',
    autoworkActive:
      execution?.heartbeatEnabled === true || isAutoworkActivelyRunning(autowork),
    activeChunkId: execution?.activeChunkId ?? autowork?.currentChunkId ?? null,
    executionScope: execution?.executionScope ?? 'none',
    timeBudgetMs: execution?.timeBudgetMs ?? null,
    deadlineAt: execution?.deadlineAt ?? null,
    heartbeatEnabled: execution?.heartbeatEnabled ?? false,
    heartbeatIntervalMs: execution?.heartbeatIntervalMs ?? null,
    swarmBackend: execution?.swarmBackend ?? 'none',
    swarmActive: execution?.swarmActive ?? false,
    swarmWorkerCount: execution?.swarmWorkerCount ?? 0,
    statusText: execution?.statusText ?? null,
    lastActivityAt,
  }
}
