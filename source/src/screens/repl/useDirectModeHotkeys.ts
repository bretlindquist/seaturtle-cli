import { useInput } from '../../ink.js';
import type { PromptInputMode } from '../../types/textInputTypes.js';

const DIRECT_MODE_HOTKEYS: Record<string, PromptInputMode> = {
  '1': 'prompt',
  '2': 'convo',
  '3': 'discovery',
  '4': 'research',
  '5': 'planning',
  '6': 'execution',
  '7': 'review',
  '8': 'debug',
};

type UseDirectModeHotkeysInput = {
  disabled: boolean
  isExiting: boolean
  screen: 'prompt' | 'transcript'
  focusedInputDialog: unknown
  isLocalJSXCommand: boolean | undefined
  setInputMode: (mode: PromptInputMode) => void
}

export function useDirectModeHotkeys({
  disabled,
  isExiting,
  screen,
  focusedInputDialog,
  isLocalJSXCommand,
  setInputMode,
}: UseDirectModeHotkeysInput): void {
  useInput(
    (input, key, event) => {
      if (!key.ctrl || key.meta) return;
      if (screen === 'transcript' || focusedInputDialog || isLocalJSXCommand) {
        return;
      }

      const nextMode = DIRECT_MODE_HOTKEYS[input]
      if (!nextMode) {
        return;
      }

      setInputMode(nextMode)
      event.stopImmediatePropagation()
    },
    {
      isActive: !disabled && !isExiting,
    },
  )
}
