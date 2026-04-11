import * as React from 'react'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { TelegramSettings } from '../../components/telegram/TelegramSettings.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmedArgs = args?.trim() || ''

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(
      'Run /telegram. It handles Telegram pairing, bot binding, multi-chat management, test, and doctor for the current project.\n\nTypical flow:\n1. Pair Telegram bot in-app\n2. Bind a saved Telegram bot to this project\n3. Send Telegram test message\n4. Run Telegram doctor if something looks wrong\n\nDeep doc: docs/TELEGRAM.md',
      { display: 'system' },
    )
    return null
  }

  return <TelegramSettings onExit={onDone} />
}
