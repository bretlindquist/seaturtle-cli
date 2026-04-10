import type { HistoryMode } from 'src/hooks/useArrowKeyHistory.js'
import type {
  EditablePromptInputMode,
  PromptInputMode,
} from 'src/types/textInputTypes.js'

export const PROMPT_LIKE_INPUT_MODES = [
  'prompt',
  'convo',
  'discovery',
  'planning',
  'execution',
  'research',
  'review',
  'debug',
] as const satisfies readonly EditablePromptInputMode[]

const PROMPT_LIKE_INPUT_MODE_SET = new Set<PromptInputMode>(
  PROMPT_LIKE_INPUT_MODES,
)

const MODE_LABELS: Record<EditablePromptInputMode, string> = {
  prompt: 'default',
  convo: 'convo',
  discovery: 'discovery',
  planning: 'planning',
  execution: 'execution',
  research: 'research',
  review: 'review',
  debug: 'debug',
  bash: 'bash',
  'orphaned-permission': 'permission',
} as const

const MODE_DESCRIPTIONS: Record<EditablePromptInputMode, string> = {
  prompt: 'general purpose',
  convo: 'conversational, playful, human',
  discovery:
    'engaging brainstorming, dot-connecting, and idea-surfacing from the user with a little Socratic and devil’s-advocate pressure',
  planning: 'structure, scope, sequencing',
  execution: 'make the change and move',
  research: 'investigate with evidence',
  review: 'inspect for risks and gaps',
  debug: 'trace, isolate, and disprove',
  bash: 'shell commands',
  'orphaned-permission': 'permission follow-up',
} as const

export function prependModeCharacterToInput(
  input: string,
  mode: PromptInputMode,
): string {
  switch (mode) {
    case 'bash':
      return `!${input}`
    default:
      return input
  }
}

export function getModeFromInput(input: string): HistoryMode {
  if (input.startsWith('!')) {
    return 'bash'
  }
  return 'prompt'
}

export function getValueFromInput(input: string): string {
  const mode = getModeFromInput(input)
  if (mode === 'prompt') {
    return input
  }
  return input.slice(1)
}

export function isInputModeCharacter(input: string): boolean {
  return input === '!'
}

export function isPromptLikeInputMode(
  mode: PromptInputMode | undefined,
): mode is (typeof PROMPT_LIKE_INPUT_MODES)[number] {
  return mode !== undefined && PROMPT_LIKE_INPUT_MODE_SET.has(mode)
}

export function getPromptInputModeLabel(mode: EditablePromptInputMode): string {
  return MODE_LABELS[mode]
}

export function getPromptInputModeDescription(
  mode: EditablePromptInputMode,
): string {
  return MODE_DESCRIPTIONS[mode]
}
