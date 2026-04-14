export const TELEGRAM_ENV_KEYS = {
  botToken: 'SEATURTLE_TELEGRAM_BOT_TOKEN',
  allowedChatIds: 'SEATURTLE_TELEGRAM_ALLOWED_CHAT_IDS',
  pollTimeoutSeconds: 'SEATURTLE_TELEGRAM_POLL_TIMEOUT_SEC',
  transcriptionApiKey: 'SEATURTLE_TELEGRAM_TRANSCRIPTION_API_KEY',
  transcriptionModel: 'SEATURTLE_TELEGRAM_TRANSCRIPTION_MODEL',
} as const

export const LEGACY_TELEGRAM_ENV_KEYS = {
  botToken: 'CLAUDE_CODE_TELEGRAM_BOT_TOKEN',
  allowedChatIds: 'CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS',
  pollTimeoutSeconds: 'CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC',
  transcriptionApiKey: 'CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_API_KEY',
  transcriptionModel: 'CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_MODEL',
} as const

export function getTelegramEnvValue(
  key: keyof typeof TELEGRAM_ENV_KEYS,
): string | undefined {
  return (
    process.env[TELEGRAM_ENV_KEYS[key]] ??
    process.env[LEGACY_TELEGRAM_ENV_KEYS[key]]
  )
}

export function getTelegramEnvLabel(
  key: keyof typeof TELEGRAM_ENV_KEYS,
): string {
  return process.env[TELEGRAM_ENV_KEYS[key]] !== undefined
    ? TELEGRAM_ENV_KEYS[key]
    : LEGACY_TELEGRAM_ENV_KEYS[key]
}

export function hasAnyTelegramEnvOverride(): boolean {
  return (
    typeof getTelegramEnvValue('botToken') === 'string' ||
    typeof getTelegramEnvValue('allowedChatIds') === 'string' ||
    typeof getTelegramEnvValue('pollTimeoutSeconds') === 'string'
  )
}
