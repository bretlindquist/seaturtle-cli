export type TelegramConfig = {
  botToken: string
  allowedChatIds: Set<string>
  pollTimeoutSeconds: number
}

export type TelegramConfigSnapshot = {
  botTokenConfigured: boolean
  allowedChatIdsCount: number
  pollTimeoutSeconds: number
  ready: boolean
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
  const snapshot = getTelegramConfigSnapshot()
  if (!snapshot.ready) {
    return null
  }

  const botToken = process.env.CLAUDE_CODE_TELEGRAM_BOT_TOKEN!.trim()
  return {
    botToken,
    allowedChatIds: parseAllowedChatIds(
      process.env.CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS,
    ),
    pollTimeoutSeconds: snapshot.pollTimeoutSeconds,
  }
}

export function getTelegramConfigSnapshot(): TelegramConfigSnapshot {
  const botToken = process.env.CLAUDE_CODE_TELEGRAM_BOT_TOKEN?.trim()
  const allowedChatIds = parseAllowedChatIds(
    process.env.CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS,
  )
  const parsedTimeout = Number.parseInt(
    process.env.CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC ?? '',
    10,
  )

  return {
    botTokenConfigured: Boolean(botToken),
    allowedChatIdsCount: allowedChatIds.size,
    pollTimeoutSeconds:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : DEFAULT_POLL_TIMEOUT_SECONDS,
    ready: Boolean(botToken) && allowedChatIds.size > 0,
  }
}
