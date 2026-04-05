import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import {
  clearProjectReminder,
  getProjectReminder,
  saveProjectReminder,
} from '../../services/remindme.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
    nextInput?: string
  },
) => void

type ReminderAction = 'set' | 'clear' | 'back'

function RemindMeMenu({ onDone }: { onDone: OnDone }): React.ReactNode {
  const reminder = getProjectReminder()

  return (
    <Dialog
      title="End-of-response reminder"
      subtitle="Keep one short reminder visible after CT replies so you do not forget the important thing."
      onCancel={() => onDone('Reminder menu dismissed', { display: 'system' })}
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>Current reminder:</Text>
          <Text dimColor>
            {reminder
              ? reminder.text
              : 'None yet. Set one with /rm <what to remember>.'}
          </Text>
        </Box>
        <Select
          options={[
            {
              label: reminder ? 'Replace reminder' : 'Set reminder',
              value: 'set' as const,
              description:
                'Prefill /rm so you can type the reminder text right away',
            },
            {
              label: reminder ? 'Clear reminder' : 'Clear reminder (not set)',
              value: 'clear' as const,
              description: reminder
                ? 'Stop showing the reminder after replies'
                : 'Nothing is set right now',
            },
            {
              label: 'Back',
              value: 'back' as const,
              description: 'Return to the conversation',
            },
          ]}
          onChange={(value: ReminderAction) => {
            if (value === 'back') {
              onDone('Reminder menu dismissed', { display: 'system' })
              return
            }

            if (value === 'clear') {
              const cleared = clearProjectReminder()
              onDone(
                cleared
                  ? 'Cleared the end-of-response reminder.\n\nNext: use /rm <what to remember> any time you want a new one.'
                  : 'There is no reminder to clear.\n\nNext: use /rm <what to remember> to set one.',
                { display: 'system' },
              )
              return
            }

            onDone(undefined, {
              display: 'skip',
              nextInput: reminder ? `/rm ${reminder.text}` : '/rm ',
            })
          }}
          onCancel={() => onDone('Reminder menu dismissed', { display: 'system' })}
        />
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmedArgs = args?.trim() || ''

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(
      'Use /rm <what to remember> to set a short reminder that CT shows after replies.\n\nRun /remindme to review or clear the current reminder. Run /rmc to clear it directly.',
      { display: 'system' },
    )
    return null
  }

  if (trimmedArgs.length > 0) {
    const reminder = saveProjectReminder(trimmedArgs)
    onDone(
      `Saved end-of-response reminder: ${reminder.text}\n\nNext: CT will show it after replies in this project. Run /remindme to review it or /rmc to clear it.`,
      { display: 'system' },
    )
    return null
  }

  return <RemindMeMenu onDone={onDone} />
}
