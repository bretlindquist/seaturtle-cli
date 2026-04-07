import * as React from 'react'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { Pane } from '../../components/design-system/Pane.js'
import {
  type OptionWithDescription,
  Select,
} from '../../components/CustomSelect/select.js'
import {
  getPromptInputModeDescription,
  getPromptInputModeLabel,
  PROMPT_LIKE_INPUT_MODES,
} from '../../components/PromptInput/inputModes.js'
import type { EditablePromptInputMode } from '../../types/textInputTypes.js'

const MODE_ALIASES: Record<string, EditablePromptInputMode> = {
  default: 'prompt',
  prompt: 'prompt',
  convo: 'convo',
  conversational: 'convo',
  discovery: 'discovery',
  discover: 'discovery',
  planning: 'planning',
  plan: 'planning',
  execution: 'execution',
  execute: 'execution',
  research: 'research',
  review: 'review',
  debug: 'debug',
}

const MODE_OPTIONS: OptionWithDescription<EditablePromptInputMode>[] =
  PROMPT_LIKE_INPUT_MODES.map(mode => ({
    label: getPromptInputModeLabel(mode),
    description: getPromptInputModeDescription(mode),
    value: mode,
  }))

function normalizeModeArg(
  args: string | undefined,
): EditablePromptInputMode | undefined {
  const key = args?.trim().toLowerCase()
  if (!key) {
    return undefined
  }
  return MODE_ALIASES[key]
}

function buildResult(mode: EditablePromptInputMode) {
  return {
    message: `Input lane set to ${getPromptInputModeLabel(mode)}`,
    options: {
      display: 'system' as const,
      nextInputMode: mode,
    },
  }
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const requestedMode = normalizeModeArg(args)
  if (requestedMode) {
    const result = buildResult(requestedMode)
    onDone(result.message, result.options)
    return null
  }

  if (args?.trim()) {
    onDone(
      `Unknown input lane "${args.trim()}". Try /mode or one of: ${PROMPT_LIKE_INPUT_MODES.map(getPromptInputModeLabel).join(', ')}`,
      { display: 'system' },
    )
    return null
  }

  return (
    <Pane
      title="Choose CT input lane"
      onCancel={() => onDone('Mode picker dismissed', { display: 'system' })}
    >
      <Select
        options={MODE_OPTIONS}
        onChange={mode => {
          const result = buildResult(mode)
          onDone(result.message, result.options)
        }}
        onCancel={() => onDone('Mode picker dismissed', { display: 'system' })}
      />
    </Pane>
  )
}
