import type { WorkflowRuntimeSnapshot } from '../projectIdentity/workflowRuntime.js'
import {
  parseAutoworkNaturalLanguageDirective,
} from './naturalLanguageDirective.js'
import type { AutoworkEntryPoint } from './state.js'

export type AutoworkExecutionPosture = {
  active: boolean
  entryPoint: AutoworkEntryPoint | null
  reason: 'runtime' | 'slash-command' | 'natural-language' | null
  addendum: string | null
}

function parseAutoworkSlashEntryPoint(
  input: string,
): AutoworkEntryPoint | null {
  const trimmed = input.trim().toLowerCase()
  if (trimmed === '/autowork' || trimmed.startsWith('/autowork ')) {
    return 'autowork'
  }
  if (trimmed === '/swim' || trimmed.startsWith('/swim ')) {
    return 'swim'
  }
  return null
}

function buildExecutionPostureAddendum({
  entryPoint,
  workflowRuntime,
  reason,
}: {
  entryPoint: AutoworkEntryPoint
  workflowRuntime: WorkflowRuntimeSnapshot | null
  reason: 'runtime' | 'slash-command' | 'natural-language'
}): string {
  const phase = workflowRuntime?.workflowPhase ?? 'idle'
  const mode = workflowRuntime?.autoworkMode ?? 'idle'
  const executionScope = workflowRuntime?.executionScope ?? 'none'
  const heartbeatLine = workflowRuntime?.heartbeatEnabled
    ? `- Heartbeat is active${workflowRuntime.heartbeatIntervalMs ? ` at ${Math.round(workflowRuntime.heartbeatIntervalMs / 1000)}s intervals.` : '.'}`
    : '- Heartbeat is not active yet on this turn.'
  const launchLine =
    reason === 'runtime'
      ? `- ${entryPoint} is already the authoritative operating mode for this turn.`
      : `- ${entryPoint} entry is explicit on this turn; switch into the real ${entryPoint} runtime behavior immediately.`

  return `# CT Autowork Execution Posture

Current posture: autowork execution
Current entry point: ${entryPoint}
Current workflow phase: ${phase}
Current autowork mode: ${mode}
Current execution scope: ${executionScope}

- Treat autowork as one deterministic operating mode, not as autonomous-sounding conversation.
${launchLine}
- Suppress the normal open/explore conversational posture while this execution posture is active.
- Prefer the real workflow order: research, then plan-hardening, then implementation, then verification, then audit-and-polish, as the persisted state allows.
- If evidence is missing, research first. If the plan is incomplete, harden the plan first. If code changed, verify before continuing.
- Keep status notes short, operational, and source-backed.
- Use tasks and bounded agents only when they materially improve evidence, implementation quality, or review quality.
${heartbeatLine}`
}

export function resolveAutoworkExecutionPosture(input: {
  currentInput: string
  workflowRuntime?: WorkflowRuntimeSnapshot | null
}): AutoworkExecutionPosture {
  const workflowRuntime = input.workflowRuntime ?? null
  const slashEntryPoint = parseAutoworkSlashEntryPoint(input.currentInput)
  const naturalLanguageDirective = parseAutoworkNaturalLanguageDirective(
    input.currentInput,
  )

  if (workflowRuntime?.autoworkActive) {
    const entryPoint =
      slashEntryPoint ?? naturalLanguageDirective?.entryPoint ?? 'autowork'

    return {
      active: true,
      entryPoint,
      reason: 'runtime',
      addendum: buildExecutionPostureAddendum({
        entryPoint,
        workflowRuntime,
        reason: 'runtime',
      }),
    }
  }

  if (slashEntryPoint) {
    return {
      active: true,
      entryPoint: slashEntryPoint,
      reason: 'slash-command',
      addendum: buildExecutionPostureAddendum({
        entryPoint: slashEntryPoint,
        workflowRuntime,
        reason: 'slash-command',
      }),
    }
  }

  if (naturalLanguageDirective) {
    return {
      active: true,
      entryPoint: naturalLanguageDirective.entryPoint,
      reason: 'natural-language',
      addendum: buildExecutionPostureAddendum({
        entryPoint: naturalLanguageDirective.entryPoint,
        workflowRuntime,
        reason: 'natural-language',
      }),
    }
  }

  return {
    active: false,
    entryPoint: null,
    reason: null,
    addendum: null,
  }
}
