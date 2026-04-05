import * as React from 'react'
import { TelegramSettings } from '../../components/telegram/TelegramSettings.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

export const call: LocalJSXCommandCall = async onDone => {
  return <TelegramSettings onExit={onDone} />
}
