import React, { Suspense, use, useDeferredValue, useEffect, useState } from 'react'
import type { DeepImmutable } from 'src/types/utils.js'
import type { CommandResultDisplay } from '../../commands.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js'
import { Box, Text } from '../../ink.js'
import { useKeybindings } from '../../keybindings/useKeybinding.js'
import type { RemoteAutoworkTaskState } from '../../tasks/RemoteAutoworkTask/guards.js'
import { formatDuration, formatFileSize, truncateToWidth } from '../../utils/format.js'
import { tailFile } from '../../utils/fsOperations.js'
import { Byline } from '../design-system/Byline.js'
import { Dialog } from '../design-system/Dialog.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'

const REMOTE_AUTOWORK_DETAIL_TAIL_BYTES = 8192

type Props = {
  task: DeepImmutable<RemoteAutoworkTaskState>
  onDone: (result?: string, options?: { display?: CommandResultDisplay }) => void
  onKill?: () => void
  onBack?: () => void
}

async function getTaskOutput(
  task: DeepImmutable<RemoteAutoworkTaskState>,
): Promise<{ content: string; bytesTotal: number }> {
  try {
    return await tailFile(task.outputFile, REMOTE_AUTOWORK_DETAIL_TAIL_BYTES)
  } catch {
    return { content: '', bytesTotal: 0 }
  }
}

function OutputTail({
  promise,
  width,
}: {
  promise: Promise<{ content: string; bytesTotal: number }>
  width: number
}): React.ReactNode {
  const output = use(promise)
  const text = output.content.trimEnd()

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Output</Text>
      <Text dimColor>
        {text.length > 0 ? truncateToWidth(text, width * 16) : 'No output yet.'}
      </Text>
      <Text dimColor>Total output: {formatFileSize(output.bytesTotal)}</Text>
    </Box>
  )
}

export function RemoteAutoworkDetailDialog({
  task,
  onDone,
  onKill,
  onBack,
}: Props): React.ReactNode {
  const { columns } = useTerminalSize()
  const [outputPromise, setOutputPromise] = useState(() => getTaskOutput(task))
  const deferredOutputPromise = useDeferredValue(outputPromise)

  useEffect(() => {
    if (task.status !== 'running') {
      return
    }
    const timer = setInterval(() => {
      setOutputPromise(getTaskOutput(task))
    }, 1000)
    return () => clearInterval(timer)
  }, [task])

  const handleClose = () =>
    onDone('Remote autowork details dismissed', { display: 'system' })

  useKeybindings(
    {
      'confirm:yes': handleClose,
    },
    { context: 'Confirmation' },
  )

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'left' && onBack) {
      e.preventDefault()
      onBack()
      return
    }
    if (e.key === 'x' && task.status === 'running' && onKill) {
      e.preventDefault()
      onKill()
    }
  }

  const runtimeMs = (task.endTime ?? Date.now()) - task.startTime
  const location =
    task.mode === 'local' ? 'local provider child' : (task.host ?? 'remote host')

  return (
    <Box flexDirection="column" tabIndex={0} autoFocus onKeyDown={handleKeyDown}>
      <Dialog
        title="Remote autowork"
        subtitle={task.description}
        onCancel={handleClose}
        inputGuide={exitState =>
          exitState.pending ? (
            <Text>Press {exitState.keyName} again to exit</Text>
          ) : (
            <Byline>
              {onBack && <KeyboardShortcutHint shortcut="←" action="go back" />}
              <KeyboardShortcutHint shortcut="Esc/Enter" action="close" />
              {task.status === 'running' && onKill && (
                <KeyboardShortcutHint shortcut="x" action="stop" />
              )}
            </Byline>
          )
        }
      >
        <Box flexDirection="column" gap={1}>
          <Text>
            <Text bold>Status:</Text> {task.status}
            {task.result?.code !== undefined ? ` (exit ${task.result.code})` : ''}
          </Text>
          <Text>
            <Text bold>Location:</Text> {location}
          </Text>
          <Text>
            <Text bold>Remote cwd:</Text>{' '}
            {truncateToWidth(task.remoteCwd, columns - 18)}
          </Text>
          <Text>
            <Text bold>Local cwd:</Text>{' '}
            {truncateToWidth(task.localCwd, columns - 17)}
          </Text>
          <Text>
            <Text bold>Runtime:</Text> {formatDuration(runtimeMs)}
          </Text>
          <Text>
            <Text bold>Action:</Text> {task.entryPoint} {task.action}
            {task.timeBudget ? ` ${task.timeBudget}` : ''}
          </Text>
          <Suspense fallback={<Text dimColor>Loading output…</Text>}>
            <OutputTail promise={deferredOutputPromise} width={columns} />
          </Suspense>
        </Box>
      </Dialog>
    </Box>
  )
}
