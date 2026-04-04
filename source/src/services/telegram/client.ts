import type { TelegramConfig } from './config.js'

type TelegramGetUpdatesResponse = {
  ok: boolean
  result: TelegramUpdate[]
}

export type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    date: number
    text?: string
    chat: {
      id: number
      type: string
      title?: string
      username?: string
    }
    from?: {
      id: number
      username?: string
      first_name?: string
      last_name?: string
    }
  }
}

type TelegramSendMessageResponse = {
  ok: boolean
}

function getBaseUrl(botToken: string): string {
  return `https://api.telegram.org/bot${botToken}`
}

export async function getTelegramUpdates(
  config: TelegramConfig,
  offset: number | undefined,
  signal?: AbortSignal,
): Promise<TelegramUpdate[]> {
  const url = new URL(`${getBaseUrl(config.botToken)}/getUpdates`)
  url.searchParams.set('timeout', String(config.pollTimeoutSeconds))
  if (offset !== undefined) {
    url.searchParams.set('offset', String(offset))
  }

  const response = await fetch(url, {
    signal,
  })
  if (!response.ok) {
    throw new Error(`Telegram getUpdates failed with ${response.status}`)
  }

  const payload = (await response.json()) as TelegramGetUpdatesResponse
  if (!payload.ok) {
    throw new Error('Telegram getUpdates returned ok=false')
  }

  return payload.result
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  chatId: string,
  text: string,
): Promise<void> {
  const response = await fetch(`${getBaseUrl(config.botToken)}/sendMessage`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with ${response.status}`)
  }

  const payload = (await response.json()) as TelegramSendMessageResponse
  if (!payload.ok) {
    throw new Error('Telegram sendMessage returned ok=false')
  }
}

export function splitTelegramMessage(text: string, maxLength = 4096): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const parts: string[] = []
  let remaining = text.trim()
  while (remaining.length > maxLength) {
    const splitAt = remaining.lastIndexOf('\n', maxLength)
    const boundary = splitAt > maxLength / 2 ? splitAt : maxLength
    parts.push(remaining.slice(0, boundary).trim())
    remaining = remaining.slice(boundary).trim()
  }
  if (remaining.length > 0) {
    parts.push(remaining)
  }
  return parts
}
