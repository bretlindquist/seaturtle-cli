import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import {
  type OptionWithDescription,
  Select,
} from '../../components/CustomSelect/select.js'
import { Pane } from '../../components/design-system/Pane.js'
import { useCommandQueue } from '../../hooks/useCommandQueue.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import type {
  EditablePromptInputMode,
  QueuedCommand,
} from '../../types/textInputTypes.js'
import {
  isQueuedCommandEditable,
  remove,
  removeByFilter,
} from '../../utils/messageQueueManager.js'
import type { PastedContent } from '../../utils/config.js'

type QueueCommandValue =
  | { kind: 'item'; command: QueuedCommand & { mode: EditablePromptInputMode } }
  | { kind: 'clear' }

type QueueActionValue = 'edit' | 'remove' | 'back'

type QueuePickerProps = {
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
      nextInput?: string
      nextInputMode?: EditablePromptInputMode
      nextPastedContents?: Record<number, PastedContent>
      submitNextInput?: boolean
    },
  ) => void
}

function extractQueuedText(command: QueuedCommand): string {
  if (typeof command.preExpansionValue === 'string') {
    return command.preExpansionValue
  }

  if (typeof command.value === 'string') {
    return command.value
  }

  return command.value
    .filter(block => block.type === 'text')
    .map(block => (block.type === 'text' ? block.text : ''))
    .join('\n')
}

function summarizeQueuedCommand(
  command: QueuedCommand & { mode: EditablePromptInputMode },
): {
  label: string
  description: string
} {
  const text = extractQueuedText(command).replace(/\s+/g, ' ').trim()
  const imageCount = Object.values(command.pastedContents ?? {}).filter(
    content => content.type === 'image',
  ).length

  return {
    label: text === '' ? '(empty queued message)' : truncate(text, 72),
    description: [
      command.mode === 'bash' ? 'bash mode' : 'prompt mode',
      imageCount > 0 ? `${imageCount} image${imageCount === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength - 1)}…`
}

function QueuePicker({ onDone }: QueuePickerProps): React.ReactNode {
  const queuedCommands = useCommandQueue().filter(isQueuedCommandEditable) as (
    QueuedCommand & { mode: EditablePromptInputMode }
  )[]
  const [selectedCommand, setSelectedCommand] = useState<
    (QueuedCommand & { mode: EditablePromptInputMode }) | null
  >(null)

  useEffect(() => {
    if (queuedCommands.length === 0) {
      onDone('No queued editable messages', { display: 'system' })
    }
  }, [onDone, queuedCommands.length])

  useEffect(() => {
    if (
      selectedCommand &&
      !queuedCommands.some(command => command === selectedCommand)
    ) {
      setSelectedCommand(null)
    }
  }, [queuedCommands, selectedCommand])

  const queueOptions = useMemo<OptionWithDescription<QueueCommandValue>[]>(() => {
    const items = queuedCommands.map(command => {
      const summary = summarizeQueuedCommand(command)
      return {
        label: summary.label,
        description: summary.description,
        value: { kind: 'item', command } as const,
      }
    })

    if (queuedCommands.length > 0) {
      items.push({
        label: 'Clear queued messages',
        description: 'Remove all editable queued prompts',
        value: { kind: 'clear' },
      })
    }

    return items
  }, [queuedCommands])

  const actionOptions = useMemo<OptionWithDescription<QueueActionValue>[]>(() => {
    if (!selectedCommand) {
      return []
    }

    return [
      {
        label: 'Edit queued message',
        description: 'Restore this queued message into the prompt input',
        value: 'edit',
      },
      {
        label: 'Remove from queue',
        description: 'Delete this queued message without restoring it',
        value: 'remove',
      },
      {
        label: 'Back',
        description: 'Return to the queued message list',
        value: 'back',
      },
    ]
  }, [selectedCommand])

  if (queuedCommands.length === 0) {
    return null
  }

  const handleQueueSelect = (selection: QueueCommandValue) => {
    if (selection.kind === 'clear') {
      const removed = removeByFilter(isQueuedCommandEditable)
      onDone(`Cleared ${removed.length} queued message${removed.length === 1 ? '' : 's'}`, {
        display: 'system',
      })
      return
    }

    setSelectedCommand(selection.command)
  }

  const handleActionSelect = (selection: QueueActionValue) => {
    if (!selectedCommand) {
      return
    }

    if (selection === 'back') {
      setSelectedCommand(null)
      return
    }

    if (selection === 'remove') {
      remove([selectedCommand])
      if (queuedCommands.length <= 1) {
        onDone('Removed queued message', { display: 'system' })
      } else {
        setSelectedCommand(null)
      }
      return
    }

    remove([selectedCommand])
    onDone(undefined, {
      display: 'skip',
      nextInput: extractQueuedText(selectedCommand),
      nextInputMode: selectedCommand.mode,
      nextPastedContents: selectedCommand.pastedContents,
    })
  }

  const selectedSummary = selectedCommand
    ? summarizeQueuedCommand(selectedCommand)
    : null

  return (
    <Pane color="permission">
      <Box flexDirection="column" gap={1}>
        <Text bold>{selectedCommand ? 'Queued message actions' : 'Queued messages'}</Text>
        {selectedSummary ? (
          <Box flexDirection="column">
            <Text>{selectedSummary.label}</Text>
            {selectedSummary.description ? (
              <Text dimColor>{selectedSummary.description}</Text>
            ) : null}
          </Box>
        ) : null}
        <Select
          options={selectedCommand ? actionOptions : queueOptions}
          onChange={selectedCommand ? handleActionSelect : handleQueueSelect}
          onCancel={() =>
            selectedCommand ? setSelectedCommand(null) : onDone('Queue dismissed', { display: 'system' })
          }
          visibleOptionCount={Math.min(
            8,
            selectedCommand ? actionOptions.length : queueOptions.length,
          )}
        />
      </Box>
    </Pane>
  )
}

export const call: LocalJSXCommandCall = async onDone => {
  return <QueuePicker onDone={onDone} />
}
