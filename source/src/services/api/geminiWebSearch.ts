import { getGeminiApiKeyAuthTarget } from './gemini.js'
import { runGeminiGenerateContent } from './geminiClient.js'
import {
  collectGeminiGroundingSources,
  extractGeminiText,
} from './geminiGrounding.js'
import type { GeminiGenerateContentRequest } from './geminiTypes.js'

export type GeminiWebSearchResult = {
  outputText: string
  sources: Array<{
    title: string
    url: string
  }>
}

export function buildGeminiWebSearchRequest(query: string): GeminiGenerateContentRequest {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: query }],
      },
    ],
    tools: [{ googleSearch: {} }],
  }
}

export async function runGeminiWebSearch(params: {
  model: string
  query: string
  signal: AbortSignal
}): Promise<GeminiWebSearchResult> {
  const auth = getGeminiApiKeyAuthTarget()
  if (!auth) {
    throw new Error(
      'Gemini auth is not configured. Use /login to link Gemini in CT, or set GEMINI_API_KEY.',
    )
  }

  const response = await runGeminiGenerateContent({
    auth,
    model: params.model,
    request: buildGeminiWebSearchRequest(params.query),
    signal: params.signal,
  })

  const candidate = response.candidates?.[0]
  return {
    outputText: extractGeminiText(candidate?.content?.parts),
    sources: collectGeminiGroundingSources(candidate?.groundingMetadata),
  }
}
