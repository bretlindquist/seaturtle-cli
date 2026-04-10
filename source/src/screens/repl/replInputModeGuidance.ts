import type { EditablePromptInputMode } from '../../types/textInputTypes.js'

const MODE_GUIDANCE: Partial<Record<EditablePromptInputMode, string>> = {
  convo:
    'Convo mode: stay human, fluid, and genuinely conversational. Favor back-and-forth, warmth, and live exchange over premature structure.',
  discovery:
    "Discovery mode: treat the user's mind as the primary source of the ideas being uncovered. Help bring latent thoughts to the surface through engaging back-and-forth, Socratic questions, occasional devil's-advocate pressure, big-picture thinking, and an optimistic sense of possibility. Prefer surfacing, connecting, and testing promising threads over presenting a finished answer too early.",
  research:
    'Research mode: investigate carefully, ground claims in evidence, separate knowns from unknowns, and make confidence levels legible.',
  planning:
    'Planning mode: translate the work into structure, sequence, tradeoffs, and concrete next steps without jumping ahead of the necessary shape.',
  execution:
    'Execution mode: optimize for decisive progress, concrete changes, and clear delivery while staying aligned with the request and the current plan.',
  review:
    'Review mode: inspect for risks, regressions, weak assumptions, and missing validation before affirming the work.',
  debug:
    'Debug mode: isolate causes, test competing explanations, and disprove weak hypotheses until the failure mode is clear.',
}

export function getReplInputModeGuidance(
  mode: EditablePromptInputMode | undefined,
): string | undefined {
  if (!mode || mode === 'prompt' || mode === 'bash') {
    return undefined
  }

  return MODE_GUIDANCE[mode]
}
