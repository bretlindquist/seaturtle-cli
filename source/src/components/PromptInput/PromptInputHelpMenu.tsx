import { feature } from 'bun:bundle'
import * as React from 'react'
import { Box, Text } from 'src/ink.js'
import { getPlatform } from 'src/utils/platform.js'
import { isKeybindingCustomizationEnabled } from '../../keybindings/loadUserBindings.js'
import { useShortcutDisplay } from '../../keybindings/useShortcutDisplay.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'
import {
  isFastModeAvailable,
  isFastModeEnabled,
} from '../../utils/fastMode.js'
import { getNewlineInstructions } from './utils.js'

function formatShortcut(shortcut: string): string {
  return shortcut.replace(/\+/g, ' + ')
}

type Props = {
  dimColor?: boolean
  fixedWidth?: boolean
  gap?: number
  paddingX?: number
  canQueueMessage?: boolean
}

function Hint({
  children,
  dimColor,
}: {
  children: React.ReactNode
  dimColor?: boolean
}): React.ReactNode {
  return (
    <Box>
      <Text dimColor={dimColor}>{children}</Text>
    </Box>
  )
}

export function PromptInputHelpMenu({
  dimColor,
  fixedWidth,
  gap,
  paddingX,
  canQueueMessage = false,
}: Props): React.ReactNode {
  const transcriptShortcut = formatShortcut(
    useShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o'),
  )
  const todosShortcut = formatShortcut(
    useShortcutDisplay('app:toggleTodos', 'Global', 'ctrl+t'),
  )
  const undoShortcut = formatShortcut(
    useShortcutDisplay('chat:undo', 'Chat', 'ctrl+_'),
  )
  const stashShortcut = formatShortcut(
    useShortcutDisplay('chat:stash', 'Chat', 'ctrl+s'),
  )
  const cycleModeShortcut = formatShortcut(
    useShortcutDisplay('chat:cycleMode', 'Chat', 'shift+tab'),
  )
  const modelPickerShortcut = formatShortcut(
    useShortcutDisplay('chat:modelPicker', 'Chat', 'alt+p'),
  )
  const fastModeShortcut = formatShortcut(
    useShortcutDisplay('chat:fastMode', 'Chat', 'alt+o'),
  )
  const externalEditorShortcut = formatShortcut(
    useShortcutDisplay('chat:externalEditor', 'Chat', 'ctrl+g'),
  )
  const terminalShortcut = formatShortcut(
    useShortcutDisplay('app:toggleTerminal', 'Global', 'meta+j'),
  )
  const imagePasteShortcut = formatShortcut(
    useShortcutDisplay('chat:imagePaste', 'Chat', 'ctrl+v'),
  )
  const queueShortcut = formatShortcut(
    useShortcutDisplay('chat:queueMessage', 'Chat', 'tab'),
  )

  const leftWidth = fixedWidth ? 24 : undefined
  const middleWidth = fixedWidth ? 35 : undefined

  const terminalShortcutElement =
    feature('TERMINAL_PANEL') &&
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_terminal_panel', false) ? (
      <Hint dimColor={dimColor}>{terminalShortcut} for terminal</Hint>
    ) : null

  return (
    <Box paddingX={paddingX} flexDirection="row" gap={gap}>
      <Box flexDirection="column" width={leftWidth}>
        <Hint dimColor={dimColor}>! for bash mode</Hint>
        <Hint dimColor={dimColor}>/mode for chat lane</Hint>
        <Hint dimColor={dimColor}>/ for commands</Hint>
        <Hint dimColor={dimColor}>@ for file paths</Hint>
        <Hint dimColor={dimColor}>&amp; for background</Hint>
        <Hint dimColor={dimColor}>/btw for side question</Hint>
        {canQueueMessage ? (
          <Hint dimColor={dimColor}>{queueShortcut} to queue message</Hint>
        ) : null}
      </Box>

      <Box flexDirection="column" width={middleWidth}>
        <Hint dimColor={dimColor}>double tap esc to clear input</Hint>
        <Hint dimColor={dimColor}>{cycleModeShortcut} to cycle permission mode</Hint>
        <Hint dimColor={dimColor}>
          {transcriptShortcut} for verbose output
        </Hint>
        <Hint dimColor={dimColor}>{todosShortcut} to toggle tasks</Hint>
        {terminalShortcutElement}
        <Hint dimColor={dimColor}>{getNewlineInstructions()}</Hint>
      </Box>

      <Box flexDirection="column">
        <Hint dimColor={dimColor}>{undoShortcut} to undo</Hint>
        {getPlatform() !== 'windows' ? (
          <Hint dimColor={dimColor}>ctrl + z to suspend</Hint>
        ) : null}
        <Hint dimColor={dimColor}>
          {imagePasteShortcut} to paste images
        </Hint>
        <Hint dimColor={dimColor}>
          {modelPickerShortcut} to switch model
        </Hint>
        {isFastModeEnabled() && isFastModeAvailable() ? (
          <Hint dimColor={dimColor}>
            {fastModeShortcut} to toggle fast mode
          </Hint>
        ) : null}
        <Hint dimColor={dimColor}>{stashShortcut} to stash prompt</Hint>
        <Hint dimColor={dimColor}>
          {externalEditorShortcut} to edit in $EDITOR
        </Hint>
        {isKeybindingCustomizationEnabled() ? (
          <Hint dimColor={dimColor}>/keybindings to customize</Hint>
        ) : null}
      </Box>
    </Box>
  )
}
