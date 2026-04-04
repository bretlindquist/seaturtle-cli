export type TelegramConfig = {
  botToken: string
  allowedChatIds: Set<string>
  pollTimeoutSeconds: number
}

const DEFAULT_POLL_TIMEOUT_SECONDS = 20

function parseAllowedChatIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set()
  }

  return new Set(
    raw
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  )
}

export function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.CLAUDE_CODE_TELEGRAM_BOT_TOKEN?.trim()
  if (!botToken) {
    return null
  }

  const allowedChatIds = parseAllowedChatIds(
    process.env.CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS,
  )
  if (allowedChatIds.size === 0) {
    return null
  }

  const parsedTimeout = Number.parseInt(
    process.env.CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC ?? '',
    10,
  )

  return {
    botToken,
    allowedChatIds,
    pollTimeoutSeconds:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : DEFAULT_POLL_TIMEOUT_SECONDS,
  }
}
