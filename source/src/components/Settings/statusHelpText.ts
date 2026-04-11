import { getPermissionModeHelpText } from './configHelpText.js'
import type { PermissionMode } from '../../types/permissions.js'

export function getStatusPermissionHelpText(
  permissionMode: PermissionMode,
): string {
  return getPermissionModeHelpText(permissionMode)
}

export function getStatusPropertyHelpText(label: string): string {
  switch (label) {
    case 'Main model runtime':
      return 'Shows which runtime is actually serving the main loop right now, not just which provider is configured.'
    case 'Collaboration mode':
      return 'Controls whether Codex uses the normal interactive lane or the background-style collaboration lane.'
    case '5h limit':
      return 'Rolling five-hour OpenAI/Codex usage window for the active account.'
    case 'Weekly limit':
      return 'Longer rolling OpenAI/Codex usage window for the active account.'
    case 'Codex status':
      return 'Whether the OpenAI/Codex runtime is active, merely available, or still blocked by auth/runtime setup.'
    case 'Codex auth':
      return 'Which OpenAI/Codex auth source is currently selected for the native runtime path.'
    case 'Codex native auth':
      return 'Whether CT can see native OpenAI/Codex account auth on this machine.'
    case 'Codex CLI fallback':
      return 'Whether the Codex CLI auth fallback is available if the native path cannot run.'
    case 'Setting sources':
      return 'These settings layers currently influence CT behavior, from user defaults through project or enterprise policy.'
    case 'Telegram':
      return 'Shows whether Telegram is paired cleanly and where the active binding is coming from.'
    case 'Telegram polling':
      return 'Long polling keeps the bot responsive without requiring a webhook deployment.'
    case 'Telegram voice':
      return 'Voice transcription support for Telegram audio and voice messages.'
    case 'Telegram setup':
      return 'Run /telegram to pair a chat, inspect the current binding, or repair the setup.'
    case 'Context window':
      return 'How much model context remains in the current session before compacting or pruning becomes important.'
    default:
      return ''
  }
}
