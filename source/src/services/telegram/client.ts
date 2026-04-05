import type { TelegramConfig } from './config.js'
import { basename } from 'path'
import { readFile } from 'fs/promises'

type TelegramGetUpdatesResponse = {
  ok: boolean
  result: TelegramUpdate[]
}

type TelegramGetMeResponse = {
  ok: boolean
  result: {
    id: number
    is_bot: boolean
    first_name: string
    username?: string
  }
}

type TelegramGetFileResponse = {
  ok: boolean
  result: {
    file_path?: string
    file_size?: number
  }
}

export type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    date: number
    text?: string
    caption?: string
    photo?: TelegramPhotoSize[]
    document?: TelegramDocument
    voice?: TelegramVoice
    audio?: TelegramAudio
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

export type TelegramPhotoSize = {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export type TelegramDocument = {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export type TelegramVoice = {
  file_id: string
  file_unique_id: string
  mime_type?: string
  duration: number
  file_size?: number
}

export type TelegramAudio = {
  file_id: string
  file_unique_id: string
  duration: number
  file_name?: string
  mime_type?: string
  title?: string
  performer?: string
  file_size?: number
}

type TelegramSendMessageResponse = {
  ok: boolean
}

export type TelegramBotIdentity = {
  id: number
  username?: string
  displayName: string
}

function getBaseUrl(botToken: string): string {
  return `https://api.telegram.org/bot${botToken}`
}

export async function getTelegramMe(params: {
  botToken: string
  signal?: AbortSignal
}): Promise<TelegramBotIdentity> {
  const response = await fetch(`${getBaseUrl(params.botToken)}/getMe`, {
    signal: params.signal,
  })

  if (!response.ok) {
    throw new Error(`Telegram getMe failed with ${response.status}`)
  }

  const payload = (await response.json()) as TelegramGetMeResponse
  if (!payload.ok) {
    throw new Error('Telegram getMe returned ok=false')
  }

  return {
    id: payload.result.id,
    username: payload.result.username,
    displayName: payload.result.first_name,
  }
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

export async function getTelegramFile(
  config: TelegramConfig,
  fileId: string,
  signal?: AbortSignal,
): Promise<{ filePath: string; fileSize?: number }> {
  const response = await fetch(`${getBaseUrl(config.botToken)}/getFile`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      file_id: fileId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Telegram getFile failed with ${response.status}`)
  }

  const payload = (await response.json()) as TelegramGetFileResponse
  if (!payload.ok || !payload.result.file_path) {
    throw new Error('Telegram getFile returned ok=false or no file_path')
  }

  return {
    filePath: payload.result.file_path,
    fileSize: payload.result.file_size,
  }
}

export async function downloadTelegramFile(
  config: TelegramConfig,
  filePath: string,
  signal?: AbortSignal,
): Promise<Buffer> {
  const response = await fetch(
    `https://api.telegram.org/file/bot${config.botToken}/${filePath}`,
    { signal },
  )

  if (!response.ok) {
    throw new Error(`Telegram file download failed with ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
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

async function sendTelegramMultipart(
  config: TelegramConfig,
  method: 'sendPhoto' | 'sendDocument',
  field: 'photo' | 'document',
  chatId: string,
  filePath: string,
  caption?: string,
): Promise<void> {
  const fileName = basename(filePath)
  const fileData = await readFile(filePath)
  const formData = new FormData()
  formData.append('chat_id', chatId)
  if (caption) {
    formData.append('caption', caption)
  }
  formData.append(field, new Blob([fileData]), fileName)

  const response = await fetch(`${getBaseUrl(config.botToken)}/${method}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Telegram ${method} failed with ${response.status}`)
  }

  const payload = (await response.json()) as TelegramSendMessageResponse
  if (!payload.ok) {
    throw new Error(`Telegram ${method} returned ok=false`)
  }
}

export async function sendTelegramPhoto(
  config: TelegramConfig,
  chatId: string,
  filePath: string,
  caption?: string,
): Promise<void> {
  await sendTelegramMultipart(
    config,
    'sendPhoto',
    'photo',
    chatId,
    filePath,
    caption,
  )
}

export async function sendTelegramDocument(
  config: TelegramConfig,
  chatId: string,
  filePath: string,
  caption?: string,
): Promise<void> {
  await sendTelegramMultipart(
    config,
    'sendDocument',
    'document',
    chatId,
    filePath,
    caption,
  )
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
