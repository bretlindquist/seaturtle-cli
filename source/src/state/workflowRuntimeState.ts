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
    left.timeBudgetMs === right.timeBudgetMs &&
    left.deadlineAt === right.deadlineAt &&
    left.heartbeatEnabled === right.heartbeatEnabled &&
    left.heartbeatIntervalMs === right.heartbeatIntervalMs &&
    left.swarmBackend === right.swarmBackend &&
    left.swarmActive === right.swarmActive &&
    left.swarmWorkerCount === right.swarmWorkerCount &&
    left.backendPolicyTarget === right.backendPolicyTarget &&
    left.backendPolicyExecutorMode === right.backendPolicyExecutorMode &&
    left.backendPolicyText === right.backendPolicyText &&
    left.cloudOffloadStatus === right.cloudOffloadStatus &&
    left.cloudOffloadPath === right.cloudOffloadPath &&
    left.cloudConfiguredHostCount === right.cloudConfiguredHostCount &&
    left.cloudRecommendation === right.cloudRecommendation &&
    left.cloudStatusText === right.cloudStatusText &&
    left.cloudRecommendationText === right.cloudRecommendationText &&
    left.cloudNextStep === right.cloudNextStep &&
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
