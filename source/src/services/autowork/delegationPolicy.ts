import { AGENT_TOOL_NAME } from '../../tools/AgentTool/constants.js'
import type { AutoworkMode } from './state.js'

export type AutoworkLifecycleDelegationMode =
  | 'none'
  | 'bounded-agent-sidecars'

export type AutoworkLifecycleDelegationPolicy = {
  mode: AutoworkLifecycleDelegationMode
  toolName: string | null
  summary: string
  allowedWork: string[]
  constraints: string[]
}

export function resolveAutoworkLifecycleDelegationPolicy(
  mode: AutoworkMode,
): AutoworkLifecycleDelegationPolicy {
  switch (mode) {
    case 'discovery':
    case 'research':
    case 'plan-hardening':
    case 'audit-and-polish':
      return {
        mode: 'bounded-agent-sidecars',
        toolName: AGENT_TOOL_NAME,
        summary:
          'Bounded sidecar delegation is allowed for evidence-gathering and review support, but the main thread remains authoritative.',
        allowedWork: [
          'source-backed research',
          'codebase tracing and seam discovery',
          'doc comparison and option analysis',
          'review passes that feed findings back to the leader',
        ],
        constraints: [
          'Delegate only narrow sidecars, not the whole lifecycle wave.',
          'Prefer one bounded sidecar at a time unless parallel work is clearly justified.',
          'Keep workflow packet updates, phase advancement, implementation start, and final completion claims on the main thread.',
          'Reconcile delegated findings back into workflow state with WorkflowStateTool before ending the wave.',
        ],
      }
    case 'execution':
    case 'verification':
    case 'idle':
      return {
        mode: 'none',
        toolName: null,
        summary:
          'No lifecycle delegation policy applies here; this path stays on the main thread.',
        allowedWork: [],
        constraints: [],
      }
  }
}
