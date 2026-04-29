import {
  createDefaultWorkflowRuntimeSnapshot,
  readWorkflowRuntimeSnapshot,
  type WorkflowRuntimeSnapshot,
} from '../services/projectIdentity/workflowRuntime.js'
import type { AppState } from './AppStateStore.js'

function snapshotsEqual(
  left: WorkflowRuntimeSnapshot,
  right: WorkflowRuntimeSnapshot,
): boolean {
  return (
    left.version === right.version &&
    left.workId === right.workId &&
    left.workflowPhase === right.workflowPhase &&
    left.autoworkMode === right.autoworkMode &&
    left.autoworkActive === right.autoworkActive &&
    left.activeChunkId === right.activeChunkId &&
    left.executionScope === right.executionScope &&
    left.heartbeatEnabled === right.heartbeatEnabled &&
    left.heartbeatIntervalMs === right.heartbeatIntervalMs &&
    left.swarmBackend === right.swarmBackend &&
    left.swarmActive === right.swarmActive &&
    left.swarmWorkerCount === right.swarmWorkerCount &&
    left.statusText === right.statusText &&
    left.lastActivityAt === right.lastActivityAt
  )
}

export function syncWorkflowRuntimeState(
  root: string,
  setAppState: (updater: (prev: AppState) => AppState) => void,
): WorkflowRuntimeSnapshot {
  const snapshot = readWorkflowRuntimeSnapshot(root)
  setAppState(prev => {
    const current = prev.workflowRuntime ?? createDefaultWorkflowRuntimeSnapshot()
    if (snapshotsEqual(current, snapshot)) {
      return prev
    }

    return {
      ...prev,
      workflowRuntime: snapshot,
    }
  })
  return snapshot
}

export function getDefaultWorkflowRuntimeState(): WorkflowRuntimeSnapshot {
  return createDefaultWorkflowRuntimeSnapshot()
}
