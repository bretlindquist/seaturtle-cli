import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Pane } from '../../components/design-system/Pane.js'
import {
  type OptionWithDescription,
  Select,
} from '../../components/CustomSelect/select.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import {
  DEFAULT_GEMINI_BEHAVIOR_MODE,
  type GeminiBehaviorMode,
} from '../../utils/geminiBehaviorMode.js'
import { getPreferredMainRuntimeProvider } from '../../utils/model/providers.js'

const GEMINI_MODE_ALIASES: Record<string, GeminiBehaviorMode | 'status'> = {
  off: 'off',
  default: 'off',
  strict: 'strict',
  status: 'status',
}

const GEMINI_MODE_OPTIONS: OptionWithDescription<GeminiBehaviorMode>[] = [
  {
    label: 'Strict',
    description:
      'Append Gemini-only coding and UX guardrails on every Gemini turn.',
    value: 'strict',
  },
  {
    label: 'Off',
    description: 'Leave Gemini behavior unmodified.',
    value: 'off',
  },
]

function getCurrentGeminiBehaviorMode(): GeminiBehaviorMode {
  return (
    getGlobalConfig().geminiBehaviorMode ?? DEFAULT_GEMINI_BEHAVIOR_MODE
  )
}

function formatGeminiModeMessage(mode: GeminiBehaviorMode): string {
  const provider = getPreferredMainRuntimeProvider()
  if (mode === 'strict') {
    return provider === 'gemini'
      ? 'Gemini strict mode ON. Future Gemini turns will carry the stricter coding and UX guardrails.'
      : 'Gemini strict mode ON. It will apply automatically when Gemini is the active main provider.'
  }

  return provider === 'gemini'
    ? 'Gemini strict mode OFF. Gemini turns will run without the extra strict-mode guardrails.'
    : 'Gemini strict mode OFF.'
}

function persistGeminiBehaviorMode(mode: GeminiBehaviorMode): void {
  saveGlobalConfig(current =>
    current.geminiBehaviorMode === mode
      ? current
      : { ...current, geminiBehaviorMode: mode },
  )
}

function normalizeGeminiArg(
  args: string | undefined,
): GeminiBehaviorMode | 'status' | undefined {
  const key = args?.trim().toLowerCase()
  if (!key) return undefined
  return GEMINI_MODE_ALIASES[key]
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const normalizedArg = normalizeGeminiArg(args)
  if (normalizedArg === 'status') {
    onDone(formatGeminiModeMessage(getCurrentGeminiBehaviorMode()), {
      display: 'system',
    })
    return null
  }

  if (normalizedArg === 'off' || normalizedArg === 'strict') {
    persistGeminiBehaviorMode(normalizedArg)
    onDone(formatGeminiModeMessage(normalizedArg))
    return null
  }

  if (args?.trim()) {
    onDone(
      `Unknown Gemini mode "${args.trim()}". Try /gemini, /gemini strict, /gemini off, or /gemini status.`,
      { display: 'system' },
    )
    return null
  }

  const currentMode = getCurrentGeminiBehaviorMode()
  const provider = getPreferredMainRuntimeProvider()

  return (
    <Pane
      title="Gemini guardrails"
      onCancel={() =>
        onDone('Gemini settings dismissed', { display: 'system' })
      }
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          Current Gemini mode: <Text bold>{currentMode}</Text>
        </Text>
        <Text dimColor>
          {provider === 'gemini'
            ? 'Gemini is the active main provider right now.'
            : 'Gemini is not the active main provider right now. This setting stays dormant until Gemini is active.'}
        </Text>
        <Select
          options={GEMINI_MODE_OPTIONS}
          defaultFocusValue={currentMode}
          onChange={mode => {
            persistGeminiBehaviorMode(mode)
            onDone(formatGeminiModeMessage(mode))
          }}
          onCancel={() =>
            onDone('Gemini settings dismissed', { display: 'system' })
          }
          layout="compact-vertical"
        />
      </Box>
    </Pane>
  )
}
