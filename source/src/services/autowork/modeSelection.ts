import type { AutoworkPlanChunk, AutoworkPlanParseResult } from './planParser.js'
import type {
  AutoworkMode,
  AutoworkStartupInspection,
  AutoworkState,
} from './state.js'
import type { WorkflowResolution } from '../projectIdentity/workflowState.js'

const RESEARCH_STOP_CODES = new Set([
  'blocking_unknown',
  'research_required',
  'low_confidence_unknown',
] as const)

const SUCCESSFUL_CHUNK_STATUSES = new Set([
  'successful',
  'completed',
] as const)

function getPendingChunkIds(chunks: AutoworkPlanChunk[]): string[] {
  return chunks.filter(chunk => chunk.status === 'pending').map(chunk => chunk.id)
}

function hasSuccessfulChunks(chunks: AutoworkPlanChunk[]): boolean {
  return chunks.some(chunk => SUCCESSFUL_CHUNK_STATUSES.has(chunk.status))
}

function hasBlockedChunks(chunks: AutoworkPlanChunk[]): boolean {
  return chunks.some(chunk => chunk.status === 'blocked')
}

function hasPlanShapingStatuses(chunks: AutoworkPlanChunk[]): boolean {
  return chunks.some(
    chunk =>
      chunk.status === 'failed' ||
      chunk.status === 'in-progress' ||
      chunk.status === 'implemented-but-unverified',
  )
}

function getEffectivePendingChunkIds(
  chunks: AutoworkPlanChunk[],
  state: AutoworkState,
): string[] {
  const completedChunkIds = new Set(state.completedChunkIds)
  const failedChunkIds = new Set(state.failedChunkIds)

  return getPendingChunkIds(chunks).filter(
    chunkId => !completedChunkIds.has(chunkId) && !failedChunkIds.has(chunkId),
  )
}

function hasEffectiveSuccessfulChunks(
  chunks: AutoworkPlanChunk[],
  state: AutoworkState,
): boolean {
  return state.completedChunkIds.length > 0 || hasSuccessfulChunks(chunks)
}

function allChunksHandledSuccessfully(
  chunks: AutoworkPlanChunk[],
  state: AutoworkState,
): boolean {
  return (
    chunks.length > 0 &&
    chunks.every(
      chunk =>
        SUCCESSFUL_CHUNK_STATUSES.has(chunk.status) ||
        state.completedChunkIds.includes(chunk.id),
    )
  )
}

function shouldUseResearchMode(
  state: AutoworkState,
  chunks: AutoworkPlanChunk[],
): boolean {
  if (state.stopReason && RESEARCH_STOP_CODES.has(state.stopReason.code as never)) {
    return true
  }

  return getPendingChunkIds(chunks).length === 0 && hasBlockedChunks(chunks)
}

export type AutoworkModeDecision = {
  mode: AutoworkMode
  reason: string
  nextPendingChunkId: string | null
}

function selectWorkflowGatedMode(
  workflowResolution: WorkflowResolution | null,
): AutoworkModeDecision | null {
  if (!workflowResolution) {
    return null
  }

  if (!workflowResolution.ok) {
    return {
      mode: 'plan-hardening',
      reason:
        workflowResolution.issues[0] ??
        workflowResolution.reason ??
        'Workflow state is inconsistent and needs hardening before autowork can continue.',
      nextPendingChunkId: null,
    }
  }

  switch (workflowResolution.autoworkEligibilityHint) {
    case 'no-active-workstream':
    case 'intent-needed':
      return {
        mode: 'discovery',
        reason: workflowResolution.reason,
        nextPendingChunkId: null,
      }
    case 'research-needed':
      return {
        mode: 'research',
        reason: workflowResolution.reason,
        nextPendingChunkId: null,
      }
    case 'plan-needed':
      return {
        mode: 'plan-hardening',
        reason: workflowResolution.reason,
        nextPendingChunkId: null,
      }
    case 'verification-needed':
      return {
        mode: 'verification',
        reason: workflowResolution.reason,
        nextPendingChunkId: workflowResolution.activeChunkId,
      }
    case 'review-needed':
      return {
        mode: 'audit-and-polish',
        reason: workflowResolution.reason,
        nextPendingChunkId: null,
      }
    case 'state-conflict':
      return {
        mode: 'plan-hardening',
        reason:
          workflowResolution.issues[0] ??
          'Workflow state is conflicting and needs hardening before autowork can continue.',
        nextPendingChunkId: null,
      }
    case 'implementation-ready':
      return null
  }
}

export function selectAutoworkMode(
  inspection: AutoworkStartupInspection,
  state: AutoworkState,
  parsedPlan: AutoworkPlanParseResult,
  workflowResolution: WorkflowResolution | null = null,
): AutoworkModeDecision {
  if (!inspection.branch || inspection.latestRelevantCommits.length === 0) {
    return {
      mode: 'discovery',
      reason: 'Startup inspection did not produce enough repo state to continue safely.',
      nextPendingChunkId: null,
    }
  }

  const workflowGated = selectWorkflowGatedMode(workflowResolution)
  if (workflowGated) {
    return workflowGated
  }

  if (inspection.hasRecentlyCompletedUnverifiedChunk) {
    return {
      mode: 'verification',
      reason: 'A recently completed chunk still requires verification before the next chunk can start.',
      nextPendingChunkId: null,
    }
  }

  if (!parsedPlan.ok) {
    return {
      mode: 'plan-hardening',
      reason: parsedPlan.message,
      nextPendingChunkId: null,
    }
  }

  const pendingChunkIds = getEffectivePendingChunkIds(parsedPlan.chunks, state)

  if (shouldUseResearchMode(state, parsedPlan.chunks)) {
    return {
      mode: 'research',
      reason: 'The plan is blocked on a real unknown and should return to research before continuing.',
      nextPendingChunkId: null,
    }
  }

  if (pendingChunkIds.length > 0) {
    return {
      mode: 'execution',
      reason: `The next executable pending chunk is ${pendingChunkIds[0]}.`,
      nextPendingChunkId: pendingChunkIds[0] ?? null,
    }
  }

  if (allChunksHandledSuccessfully(parsedPlan.chunks, state)) {
    if (state.currentMode === 'audit-and-polish' && state.lastFinishedAt !== null) {
      return {
        mode: 'idle',
        reason: 'All chunks are complete and the last cycle already entered audit-and-polish.',
        nextPendingChunkId: null,
      }
    }

    return {
      mode: 'audit-and-polish',
      reason: 'All chunks are complete; the next step is a low-risk audit-and-polish pass.',
      nextPendingChunkId: null,
    }
  }

  if (
    hasPlanShapingStatuses(parsedPlan.chunks) ||
    hasEffectiveSuccessfulChunks(parsedPlan.chunks, state)
  ) {
    return {
      mode: 'plan-hardening',
      reason: 'The plan contains non-pending unfinished chunk states and needs to be reshaped before more execution.',
      nextPendingChunkId: null,
    }
  }

  return {
    mode: 'idle',
    reason: 'No executable work remains.',
    nextPendingChunkId: null,
  }
}
