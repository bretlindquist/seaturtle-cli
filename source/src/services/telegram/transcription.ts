import { basename } from 'path'
import { readFile, stat } from 'fs/promises'
import { getTelegramEnvValue, TELEGRAM_ENV_KEYS } from './env.js'

const DEFAULT_OPENAI_TRANSCRIPTION_MODEL = 'whisper-1'
const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024

export type TelegramTranscriptionConfig = {
  apiKey: string
  model: string
}

type OpenAiTranscriptionResponse = {
  text?: string
}

export function getTelegramTranscriptionConfig(): TelegramTranscriptionConfig | null {
  const apiKey =
    getTelegramEnvValue('transcriptionApiKey')?.trim() ||
    process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    model:
      getTelegramEnvValue('transcriptionModel')?.trim() ||
      DEFAULT_OPENAI_TRANSCRIPTION_MODEL,
  }
}

export function getTelegramTranscriptionGateMessage(): string {
  return (
    'Telegram voice-note transcription is not configured. ' +
    `Set ${TELEGRAM_ENV_KEYS.transcriptionApiKey} or OPENAI_API_KEY to enable Whisper transcription.`
  )
}

export async function transcribeTelegramAudioFile(params: {
  filePath: string
  mimeType?: string
}): Promise<string> {
  const config = getTelegramTranscriptionConfig()
  if (!config) {
    throw new Error(getTelegramTranscriptionGateMessage())
  }

  const fileStats = await stat(params.filePath)
  if (!fileStats.isFile()) {
    throw new Error(`Telegram audio file not found: ${params.filePath}`)
  }
  if (fileStats.size > MAX_TRANSCRIPTION_BYTES) {
    throw new Error(
      `Telegram audio file exceeds OpenAI transcription upload limit (${MAX_TRANSCRIPTION_BYTES} bytes)`,
    )
  }
  const fileData = await readFile(params.filePath)

  const formData = new FormData()
  formData.append(
    'file',
    new Blob([fileData], {
      type: params.mimeType || 'application/octet-stream',
    }),
    basename(params.filePath),
  )
  formData.append('model', config.model)

  const response = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: formData,
    },
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `OpenAI transcription failed with ${response.status}: ${detail || 'no response body'}`,
    )
  }

  const payload = (await response.json()) as OpenAiTranscriptionResponse
  const text = payload.text?.trim()
  if (!text) {
    throw new Error('OpenAI transcription returned no text')
  }
  return text
}
