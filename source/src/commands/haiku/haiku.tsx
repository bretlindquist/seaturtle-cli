import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import {
  disableStartupHaiku,
  enableRareStartupHaiku,
  getCtHaikuDisplay,
  getCtHaikuSummary,
  getHaikuState,
} from '../../services/projectIdentity/haiku.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type HaikuAction = 'now' | 'rare' | 'off' | 'back'

function buildHaikuResult(seed: string): string {
  return getCtHaikuDisplay(seed)
}

function applyHaikuAction(
  action: Exclude<HaikuAction, 'back'>,
  onDone: OnDone,
): void {
  switch (action) {
    case 'now':
      onDone(buildHaikuResult(`${Date.now()}`), { display: 'system' })
      return
    case 'rare':
      enableRareStartupHaiku()
      onDone(
        'Rare startup haiku enabled.\n\nNext: CT may occasionally arrive in a creative tide and offer a quiet haiku on startup.',
        { display: 'system' },
      )
      return
    case 'off':
      disableStartupHaiku()
      onDone(
        'Startup haiku disabled.\n\nNext: CT will keep the ordinary greeting path.',
        { display: 'system' },
      )
  }
}

function HaikuMenu({ onDone }: { onDone: OnDone }): React.ReactNode {
  const state = getHaikuState()

  return (
    <Dialog
      title="Haiku"
      subtitle="Small SeaTurtle poems, used sparingly. The point is resonance, not noise."
      onCancel={() => onDone('Haiku menu dismissed', { display: 'system' })}
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>Current status:</Text>
          <Text dimColor>{getCtHaikuSummary()}</Text>
          {state.startupMode === 'rare' ? (
            <Text dimColor>Startup mode: rare creative disposition</Text>
          ) : null}
        </Box>
        <Select
          options={[
            {
              label: 'Recite one now',
              value: 'now' as const,
              description: 'Print a SeaTurtle haiku immediately',
            },
            {
              label:
                state.startupMode === 'rare'
                  ? 'Rare startup haiku (enabled)'
                  : 'Enable rare startup haiku',
              value: 'rare' as const,
              description:
                'Let startup occasionally turn creative and offer a quiet haiku',
            },
            {
              label:
                state.startupMode === 'off'
                  ? 'Turn startup haiku off (already off)'
                  : 'Turn startup haiku off',
              value: 'off' as const,
              description: 'Keep CT on the ordinary greeting path',
            },
            {
              label: 'Back',
              value: 'back' as const,
              description: 'Return to the conversation',
            },
          ]}
          onChange={(value: HaikuAction) => {
            if (value === 'back') {
              onDone('Haiku menu dismissed', { display: 'system' })
              return
            }

            if (value === 'off' && state.startupMode === 'off') {
              onDone('Startup haiku is already off.', { display: 'system' })
              return
            }

            applyHaikuAction(value, onDone)
          }}
          onCancel={() => onDone('Haiku menu dismissed', { display: 'system' })}
        />
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmedArgs = args?.trim().toLowerCase() || ''

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(
      'Run /haiku for the menu.\n\nFast paths:\n- /haiku now\n- /haiku rare\n- /haiku off',
      { display: 'system' },
    )
    return null
  }

  return <HaikuCommandRouter onDone={onDone} arg={trimmedArgs} />
}

function HaikuCommandRouter({
  onDone,
  arg,
}: {
  onDone: OnDone
  arg: string
}): React.ReactNode {
  if (arg === '') {
    return <HaikuMenu onDone={onDone} />
  }

  if (arg === 'now' || arg === 'one' || arg === 'recite') {
    applyHaikuAction('now', onDone)
    return null
  }

  if (arg === 'rare' || arg === 'startup') {
    applyHaikuAction('rare', onDone)
    return null
  }

  if (arg === 'off' || arg === 'disable' || arg === 'stop') {
    if (getHaikuState().startupMode === 'off') {
      onDone('Startup haiku is already off.', { display: 'system' })
      return null
    }
    applyHaikuAction('off', onDone)
    return null
  }

  onDone(
    'Unknown haiku option.\n\nUse /haiku for the menu, or one of:\n- /haiku now\n- /haiku rare\n- /haiku off',
    { display: 'system' },
  )
  return null
}
