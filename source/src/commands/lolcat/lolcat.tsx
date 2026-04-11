import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text, useTheme, useThemeSetting } from '../../ink.js'
import {
  disableLolcat,
  enableAnimatedLolcat,
  enableStaticLolcat,
  getLolcatRestoreTheme,
  getLolcatState,
  toggleAnimatedLolcatPersistence,
} from '../../services/lolcat.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import type { ThemeSetting } from '../../utils/theme.js'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type LolcatAction = 'static' | 'animated' | 'anipersist' | 'off' | 'back'

function getLolcatSummary(themeSetting: ThemeSetting): string {
  const lolcatState = getLolcatState()

  if (themeSetting !== 'lolcat') {
    return 'Lolcat is currently off.'
  }

  if (lolcatState.mode === 'animated') {
    return lolcatState.persistAnimation
      ? 'Lolcat is dazzling and persistent. Every render is a rainbow wave.'
      : 'Lolcat is animated for now. Your next command or prompt will calm it back down.'
  }

  return 'Lolcat is on in static rainbow mode.'
}

function applyLolcatAction(
  action: Exclude<LolcatAction, 'back'>,
  themeSetting: ThemeSetting,
  setTheme: (setting: ThemeSetting) => void,
  onDone: OnDone,
): void {
  switch (action) {
    case 'static': {
      enableStaticLolcat(themeSetting)
      setTheme('lolcat')
      onDone(
        'Lolcat theme enabled.\n\nNext: run /lolcat ani if you want the dazzling animated version.',
        { display: 'system' },
      )
      return
    }
    case 'animated': {
      enableAnimatedLolcat(themeSetting, false)
      setTheme('lolcat')
      onDone(
        'Lolcat animation enabled.\n\nNext: it will settle back to static rainbow after your next command unless you turn on /lolcat anipersist.',
        { display: 'system' },
      )
      return
    }
    case 'anipersist': {
      const next = toggleAnimatedLolcatPersistence(themeSetting)
      setTheme('lolcat')
      onDone(
        next.persistAnimation
          ? 'Persistent lolcat animation enabled.\n\nNext: the rainbow animation will keep running until you turn it off with /lolcat off.'
          : 'Persistent lolcat animation disabled.\n\nNext: the animation will stop after your next command and settle into static rainbow.',
        { display: 'system' },
      )
      return
    }
    case 'off': {
      const restoreTheme = getLolcatRestoreTheme()
      disableLolcat()
      setTheme(restoreTheme)
      onDone(
        `Lolcat disabled.\n\nNext: CT is back on ${restoreTheme} theme.`,
        { display: 'system' },
      )
    }
  }
}

function LolcatMenu({ onDone }: { onDone: OnDone }): React.ReactNode {
  const [theme, setTheme] = useTheme()
  const themeSetting = useThemeSetting()
  const lolcatState = getLolcatState()

  return (
    <Dialog
      title="Lolcat"
      subtitle="Turn the whole CT shell rainbow. Animated lolcat is temporary by default unless you intentionally go full internet goblin."
      onCancel={() => onDone('Lolcat menu dismissed', { display: 'system' })}
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>Current status:</Text>
          <Text dimColor>{getLolcatSummary(themeSetting)}</Text>
          {theme === 'lolcat' && lolcatState.mode === 'animated' ? (
            <Text dimColor>
              Persistence: {lolcatState.persistAnimation ? 'on' : 'off'}
            </Text>
          ) : null}
        </Box>
        <Select
          options={[
            {
              label: 'Static rainbow',
              value: 'static' as const,
              description: 'Enable the all-rainbow lolcat theme',
            },
            {
              label: 'Animated rainbow',
              value: 'animated' as const,
              description:
                'Enable the dazzling animated version until your next command',
            },
            {
              label:
                themeSetting === 'lolcat' &&
                lolcatState.mode === 'animated' &&
                lolcatState.persistAnimation
                  ? 'Disable animation persistence'
                  : 'Enable animation persistence',
              value: 'anipersist' as const,
              description:
                themeSetting === 'lolcat' &&
                lolcatState.mode === 'animated' &&
                lolcatState.persistAnimation
                  ? 'Let the next command settle it back down'
                  : 'Keep the animation running between commands until you turn it off',
            },
            {
              label:
                themeSetting === 'lolcat' ? 'Turn lolcat off' : 'Turn lolcat off (already off)',
              value: 'off' as const,
              description:
                themeSetting === 'lolcat'
                  ? 'Restore the theme you were using before lolcat'
                  : 'Return without changing anything',
            },
            {
              label: 'Back',
              value: 'back' as const,
              description: 'Return to the conversation',
            },
          ]}
          onChange={(value: LolcatAction) => {
            if (value === 'back') {
              onDone('Lolcat menu dismissed', { display: 'system' })
              return
            }

            if (value === 'off' && themeSetting !== 'lolcat') {
              onDone('Lolcat is already off.', { display: 'system' })
              return
            }

            applyLolcatAction(value, themeSetting, setTheme, onDone)
          }}
          onCancel={() => onDone('Lolcat menu dismissed', { display: 'system' })}
        />
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmedArgs = args?.trim().toLowerCase() || ''

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(
      'Run /lolcat for the rainbow menu.\n\nFast paths:\n- /lolcat static\n- /lolcat ani\n- /lolcat anipersist\n- /lolcat off\n\nAnimated lolcat stops on your next command unless persistence is on.',
      { display: 'system' },
    )
    return null
  }

  return <LolcatCommandRouter onDone={onDone} arg={trimmedArgs} />
}

function LolcatCommandRouter({
  onDone,
  arg,
}: {
  onDone: OnDone
  arg: string
}): React.ReactNode {
  const [, setTheme] = useTheme()
  const themeSetting = useThemeSetting()

  if (arg === '') {
    return <LolcatMenu onDone={onDone} />
  }

  if (arg === 'static') {
    applyLolcatAction('static', themeSetting, setTheme, onDone)
    return null
  }

  if (arg === 'ani' || arg === 'animated') {
    applyLolcatAction('animated', themeSetting, setTheme, onDone)
    return null
  }

  if (arg === 'anipersist') {
    applyLolcatAction('anipersist', themeSetting, setTheme, onDone)
    return null
  }

  if (arg === 'off' || arg === 'stop' || arg === 'disable') {
    if (themeSetting !== 'lolcat') {
      onDone('Lolcat is already off.', { display: 'system' })
      return null
    }
    applyLolcatAction('off', themeSetting, setTheme, onDone)
    return null
  }

  onDone(
    'Unknown lolcat option.\n\nUse /lolcat for the menu, or one of:\n- /lolcat static\n- /lolcat ani\n- /lolcat anipersist\n- /lolcat off',
    { display: 'system' },
  )
  return null
}
