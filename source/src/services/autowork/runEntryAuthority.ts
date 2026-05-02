import { getCtProjectRoot } from '../projectIdentity/paths.js'
import { peekActiveWorkstream } from '../projectIdentity/workflowState.js'
import { inspectAndSelectAutoworkMode } from './runner.js'
import {
  resolveActiveAutoworkPlanFile,
  type AutoworkPlanResolutionResult,
} from './planResolution.js'
import { readAutoworkState } from './state.js'

export type AutoworkRunAction = 'run' | 'step'

export type AutoworkRunEntryAuthorityResult =
  | {
      ok: true
      planPath: string | null
      repoRoot: string | null
      source: 'tracked-plan' | 'workflow-bootstrap'
    }
  | {
      ok: false
      repoRoot: string | null
      code: AutoworkPlanResolutionResult extends { ok: false; code: infer T }
        ? T
        : never
      message: string
      shouldStop: boolean
      clearSelectedPlan: boolean
      clearWorkflowPlan: boolean
      clearSourcePlan: boolean
    }

function hasActiveAutoworkContract(repoRoot: string): boolean {
  const state = readAutoworkState(repoRoot)
  const execution = peekActiveWorkstream(repoRoot)?.packets.execution ?? null

  return (
    state.currentMode !== 'idle' ||
    state.stopReason !== null ||
    state.selectedPlanPath !== null ||
    state.sourcePlanPath !== null ||
    execution?.heartbeatEnabled === true
  )
}

function resolveRelatedStaleAuthorityClears(
  repoRoot: string,
  code: string,
): {
  clearSelectedPlan: boolean
  clearWorkflowPlan: boolean
  clearSourcePlan: boolean
} {
  const state = readAutoworkState(repoRoot)
  const workflowPlanPath =
    peekActiveWorkstream(repoRoot)?.packets.plan.promotedPlanDocs[0] ?? null

  const clearSelectedPlan = code === 'stale_selected_plan'
  const clearWorkflowPlan =
    code === 'stale_workflow_plan' ||
    (code === 'stale_selected_plan' &&
      state.selectedPlanPath !== null &&
      workflowPlanPath === state.selectedPlanPath)
  const clearSourcePlan =
    code === 'stale_state_plan' ||
    (code === 'stale_selected_plan' &&
      state.selectedPlanPath !== null &&
      state.sourcePlanPath === state.selectedPlanPath) ||
    (code === 'stale_workflow_plan' &&
      workflowPlanPath !== null &&
      state.sourcePlanPath === workflowPlanPath)

  return {
    clearSelectedPlan,
    clearWorkflowPlan,
    clearSourcePlan,
  }
}

export async function resolveAutoworkRunEntryAuthority(
  entryPoint: 'autowork' | 'swim',
  action: AutoworkRunAction,
  root: string = getCtProjectRoot(),
): Promise<AutoworkRunEntryAuthorityResult> {
  const resolved = await resolveActiveAutoworkPlanFile(root)
  if (resolved.ok) {
    return {
      ok: true,
      planPath: resolved.planPath,
      repoRoot: resolved.repoRoot,
      source: 'tracked-plan',
    }
  }

  const bootstrapContext = await inspectAndSelectAutoworkMode(null)
  if (
    bootstrapContext.repoRoot &&
    (bootstrapContext.mode === 'discovery' ||
      bootstrapContext.mode === 'research' ||
      bootstrapContext.mode === 'plan-hardening' ||
      bootstrapContext.mode === 'audit-and-polish')
  ) {
    return {
      ok: true,
      planPath: null,
      repoRoot: bootstrapContext.repoRoot,
      source: 'workflow-bootstrap',
    }
  }

  const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
  const shouldStop =
    resolved.repoRoot !== null && hasActiveAutoworkContract(resolved.repoRoot)
  const relatedClears =
    resolved.repoRoot !== null
      ? resolveRelatedStaleAuthorityClears(resolved.repoRoot, resolved.code)
      : {
          clearSelectedPlan: false,
          clearWorkflowPlan: false,
          clearSourcePlan: false,
        }

  return {
    ok: false,
    repoRoot: resolved.repoRoot,
    code: resolved.code,
    message: [
      resolved.message,
      '',
      `Then rerun ${baseName} ${action} after the tracked plan is ready.`,
    ].join('\n'),
    shouldStop,
    clearSelectedPlan: relatedClears.clearSelectedPlan,
    clearWorkflowPlan: relatedClears.clearWorkflowPlan,
    clearSourcePlan: relatedClears.clearSourcePlan,
  }
}
