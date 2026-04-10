import type { QueuedCommand } from '../../types/textInputTypes.js'
import type { TelegramProjectBinding } from '../../utils/config.js'
import type { TelegramInboundPayload } from './media.js'

export type TelegramCapabilityMode = NonNullable<
  TelegramProjectBinding['capabilityMode']
>

export const DEFAULT_TELEGRAM_CAPABILITY_MODE: TelegramCapabilityMode =
  'research'

export function resolveTelegramCapabilityMode(
  value: unknown,
): TelegramCapabilityMode {
  return value === 'convo' ? 'convo' : DEFAULT_TELEGRAM_CAPABILITY_MODE
}

export function getTelegramCapabilityModeLabel(
  mode: TelegramCapabilityMode,
): string {
  switch (mode) {
    case 'convo':
      return 'Conversation'
    case 'research':
    default:
      return 'Research'
  }
}

export function getTelegramCapabilityModeHelp(
  mode: TelegramCapabilityMode,
): string {
  switch (mode) {
    case 'convo':
      return 'Telegram prompts arrive in convo mode for more human back-and-forth and lighter exploratory discussion.'
    case 'research':
    default:
      return 'Telegram prompts arrive in research mode so CT can investigate, use tools, and reach for web-backed answers when permissions allow.'
  }
}

export function getTelegramPromptModeForCapability(
  mode: TelegramCapabilityMode,
): 'convo' | 'research' {
  return mode === 'convo' ? 'convo' : 'research'
}

export function buildTelegramInboundQueuedCommand(
  inbound: TelegramInboundPayload,
  capabilityMode: TelegramCapabilityMode,
): QueuedCommand | null {
  if (inbound.kind === 'notice') {
    return null
  }

  return {
    value: inbound.kind === 'text' ? inbound.text : inbound.content,
    mode: getTelegramPromptModeForCapability(capabilityMode),
    skipSlashCommands: true,
  }
}
