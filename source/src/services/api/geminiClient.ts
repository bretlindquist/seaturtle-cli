import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import type {
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
} from './geminiTypes.js'

export type GeminiNativeAuthTarget = {
  baseUrl: string
  apiKey: string
  source: string
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function encodeModelForPath(model: string): string {
  return encodeURIComponent(model).replace(/%2F/g, '/')
}

export function buildGeminiGenerateContentEndpoint(params: {
  baseUrl: string
  model: string
}): string {
  return `${normalizeBaseUrl(params.baseUrl)}/models/${encodeModelForPath(params.model)}:generateContent`
}

export function buildGeminiStreamGenerateContentEndpoint(params: {
  baseUrl: string
  model: string
}): string {
  return `${normalizeBaseUrl(params.baseUrl)}/models/${encodeModelForPath(params.model)}:streamGenerateContent`
}

export function formatGeminiHttpError(params: {
  status: number
  statusText: string
  body: string
}): string {
  try {
    const parsed = JSON.parse(params.body) as GeminiGenerateContentResponse
    const message = parsed.error?.message
    if (typeof message === 'string' && message.trim()) {
      return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText} · ${message.trim()}`
    }
  } catch {
    // Fall through to raw body.
  }

  return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText}${params.body ? ` · ${params.body}` : ''}`
}

export async function runGeminiGenerateContent(params: {
  auth: GeminiNativeAuthTarget
  model: string
  request: GeminiGenerateContentRequest
  signal: AbortSignal
}): Promise<GeminiGenerateContentResponse> {
  const response = await fetch(
    buildGeminiGenerateContentEndpoint({
      baseUrl: params.auth.baseUrl,
      model: params.model,
    }),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': params.auth.apiKey,
      },
      body: JSON.stringify(params.request),
      signal: params.signal,
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      formatGeminiHttpError({
        status: response.status,
        statusText: response.statusText,
        body,
      }),
    )
  }

  return (await response.json()) as GeminiGenerateContentResponse
}
