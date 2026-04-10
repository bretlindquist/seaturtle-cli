import type { EditablePromptInputMode } from '../../types/textInputTypes.js'
import {
  getPromptInputModeLabel,
  PROMPT_LIKE_INPUT_MODES,
} from './inputModes.js'

export type FooterControlGroup = 'execution' | 'permissions'

export const FOOTER_CONTROL_GROUPS: readonly FooterControlGroup[] = [
  'execution',
  'permissions',
]

export function getAvailableFooterControlGroups(
  includeExecution: boolean,
): readonly FooterControlGroup[] {
  return includeExecution ? FOOTER_CONTROL_GROUPS : ['permissions']
}

export function getNextFooterControlGroup(
  current: FooterControlGroup | null,
  groups: readonly FooterControlGroup[],
): FooterControlGroup | null {
  if (groups.length === 0) {
    return null
  }
  if (current === null) {
    return groups[0] ?? null
  }
  const index = groups.indexOf(current)
  if (index === -1) {
    return groups[0] ?? null
  }
  return groups[index + 1] ?? null
}

export function getAdjacentExecutionMode(
  current: EditablePromptInputMode,
  delta: 1 | -1,
): EditablePromptInputMode {
  const index = PROMPT_LIKE_INPUT_MODES.indexOf(current)
  const safeIndex = index === -1 ? 0 : index
  const nextIndex =
    (safeIndex + delta + PROMPT_LIKE_INPUT_MODES.length) %
    PROMPT_LIKE_INPUT_MODES.length
  return PROMPT_LIKE_INPUT_MODES[nextIndex]!
}

export function getFooterExecutionModeLabel(
  mode: EditablePromptInputMode,
): string {
  return getPromptInputModeLabel(mode)
}
