import { getGeminiApiKeyAuthTarget } from './gemini.js'
import { runGeminiGenerateContent } from './geminiClient.js'
import {
  collectGeminiUrlMetadata,
  extractGeminiText,
  validateGeminiUrlContextUrls,
} from './geminiGrounding.js'
import type { GeminiGenerateContentRequest } from './geminiTypes.js'

export type GeminiUrlContextResult = {
  outputText: string
  retrievedUrls: Array<{
    retrievedUrl: string
    urlRetrievalStatus: string | null
  }>
}

export function buildGeminiUrlContextRequest(params: {
  prompt: string
  urls: string[]
}): GeminiGenerateContentRequest {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${params.prompt}\n\nURLs:\n${params.urls.join('\n')}`,
          },
        ],
      },
    ],
    tools: [{ urlContext: {} }],
  }
}

export async function runGeminiUrlContext(params: {
  model: string
  prompt: string
  urls: string[]
  signal: AbortSignal
}): Promise<GeminiUrlContextResult> {
  const auth = getGeminiApiKeyAuthTarget()
  if (!auth) {
    throw new Error(
      'Gemini auth is not configured. Use /login to link Gemini in CT, or set GEMINI_API_KEY.',
    )
  }

  const validationError = validateGeminiUrlContextUrls(params.urls)
  if (validationError) {
    throw new Error(validationError)
  }

  const response = await runGeminiGenerateContent({
    auth,
    model: params.model,
    request: buildGeminiUrlContextRequest(params),
    signal: params.signal,
  })

  const candidate = response.candidates?.[0]
  return {
    outputText: extractGeminiText(candidate?.content?.parts),
    retrievedUrls: collectGeminiUrlMetadata(
      candidate?.urlContextMetadata ?? candidate?.url_context_metadata,
    ),
  }
}
