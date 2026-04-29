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
      return 'Which runtime is serving the main loop right now.'
    case 'Collaboration mode':
      return 'How CT is collaborating in this session.'
    case '5h limit':
      return 'Rolling five-hour OpenAI/Codex usage window.'
    case 'Weekly limit':
      return 'Rolling weekly OpenAI/Codex usage window.'
    case 'Codex status':
      return 'Whether the Codex runtime is active or blocked.'
    case 'Codex auth':
      return 'Which auth source the native Codex runtime is using.'
    case 'Codex native auth':
      return 'Whether native Codex auth is available on this machine.'
    case 'Codex CLI fallback':
      return 'Whether CLI auth fallback is available.'
    case 'OpenAI computer use':
      return 'Whether computer use is actually usable here and which prerequisite is missing when it is not.'
    case 'Setting sources':
      return 'Which settings layers are currently affecting CT.'
    case 'Telegram':
      return 'Telegram readiness and active binding source.'
    case 'Telegram polling':
      return 'Polling cadence for the bot transport.'
    case 'Telegram voice':
      return 'Voice-note transcription status.'
    case 'Telegram setup':
      return 'Use /telegram to pair, inspect, or repair it.'
    case 'Context window':
      return 'How much session context remains before compaction matters.'
    case 'Active workstream':
      return 'The project-scoped workstream currently tracked by the workflow contract.'
    case 'Workflow phase':
      return 'Which lifecycle phase the active workstream is in right now.'
    case 'Workflow readiness':
      return 'What the workflow contract says is needed before autonomous execution can continue cleanly.'
    case 'Plan artifact':
      return 'The promoted human-facing plan document currently linked to the active workstream.'
    default:
      return ''
  }
}
