#!/usr/bin/env bun

type GeminiLiveAuth = {
  apiKey: string
  baseUrl: string
}

export function getGeminiLiveAuthOrSkip(): GeminiLiveAuth | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    console.log('skip: GEMINI_API_KEY is not configured')
    return null
  }

  return {
    apiKey,
    baseUrl:
      process.env.GEMINI_BASE_URL?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta',
  }
}

export async function runGeminiLiveRequest(params: {
  auth: GeminiLiveAuth
  model: string
  request: Record<string, unknown>
}): Promise<any> {
  const response = await fetch(
    `${params.auth.baseUrl}/models/${encodeURIComponent(params.model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': params.auth.apiKey,
      },
      body: JSON.stringify(params.request),
    },
  )

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(
      payload?.error?.message || `Gemini live check failed with ${response.status}`,
    )
  }

  return payload
}
