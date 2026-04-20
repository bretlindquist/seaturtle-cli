import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import type {
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
} from './geminiTypes.js'
import { parseGeminiStreamSseEvents } from './geminiStreamParser.js'

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
  return `${normalizeBaseUrl(params.baseUrl)}/models/${encodeModelForPath(params.model)}:streamGenerateContent?alt=sse`
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

export async function* runGeminiStreamGenerateContent(params: {
  auth: GeminiNativeAuthTarget
  model: string
  request: GeminiGenerateContentRequest
  signal: AbortSignal
}): AsyncGenerator<GeminiGenerateContentResponse, void> {
  const response = await fetch(
    buildGeminiStreamGenerateContentEndpoint({
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

  if (!response.body) {
    throw new Error(`${API_ERROR_MESSAGE_PREFIX}: Gemini streaming response had no body`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (params.signal.aborted) {
        throw params.signal.reason instanceof Error
          ? params.signal.reason
          : new Error('Gemini streaming request was aborted')
      }

      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const parsed = parseGeminiStreamSseEvents(buffer)
      buffer = parsed.remainder
      for (const event of parsed.events) {
        yield event
      }
    }

    buffer += decoder.decode()
    const parsed = parseGeminiStreamSseEvents(`${buffer}\n\n`)
    for (const event of parsed.events) {
      yield event
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${API_ERROR_MESSAGE_PREFIX}: malformed Gemini stream event`)
    }
    throw error
  } finally {
    reader.releaseLock()
  }
}
