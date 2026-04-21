import { getGeminiApiKeyAuthTarget } from './gemini.js'
import { runGeminiGenerateContent } from './geminiClient.js'
import { extractGeminiText } from './geminiGrounding.js'
import {
  getConfiguredGeminiFileSearchStoreNames,
  getDefaultGeminiFileSearchStoreName,
} from './geminiFileSearchConfig.js'
import type {
  GeminiGenerateContentRequest,
  GeminiGroundingMetadata,
} from './geminiTypes.js'

export type GeminiFileSearchResult = {
  outputText: string
  results: Array<{
    fileId: string | null
    filename: string | null
    score: number | null
    snippet: string | null
  }>
}

function collectGeminiFileSearchResults(
  groundingMetadata: GeminiGroundingMetadata | undefined,
): GeminiFileSearchResult['results'] {
  return (groundingMetadata?.groundingChunks ?? [])
    .flatMap(chunk => {
      const retrievedContext =
        chunk.retrievedContext ?? chunk.retrieved_context ?? null
      if (!retrievedContext) {
        return []
      }

      return [
        {
          fileId: retrievedContext.uri ?? null,
          filename: retrievedContext.title ?? null,
          score: null,
          snippet: retrievedContext.text ?? null,
        },
      ]
    })
}

export function buildGeminiFileSearchRequest(params: {
  query: string
  storeNames: string[]
}): GeminiGenerateContentRequest {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: params.query }],
      },
    ],
    tools: [
      {
        fileSearch: {
          fileSearchStoreNames: params.storeNames,
        },
      },
    ],
  }
}

export async function runGeminiFileSearch(params: {
  model: string
  query: string
  signal: AbortSignal
  storeNames?: string[]
}): Promise<GeminiFileSearchResult> {
  const auth = getGeminiApiKeyAuthTarget()
  if (!auth) {
    throw new Error(
      'Gemini auth is not configured. Use /login to link Gemini in CT, or set GEMINI_API_KEY.',
    )
  }

  const configuredStoreNames =
    params.storeNames && params.storeNames.length > 0
      ? params.storeNames
      : getConfiguredGeminiFileSearchStoreNames()

  if (configuredStoreNames.length === 0) {
    throw new Error(
      'Gemini file search is not configured. Set SEATURTLE_GEMINI_FILE_SEARCH_STORE_NAMES to one or more fileSearchStores/* names and retry.',
    )
  }

  const defaultStore = getDefaultGeminiFileSearchStoreName()
  const storeNames =
    defaultStore && configuredStoreNames.includes(defaultStore)
      ? [defaultStore]
      : configuredStoreNames

  const response = await runGeminiGenerateContent({
    auth,
    model: params.model,
    request: buildGeminiFileSearchRequest({
      query: params.query,
      storeNames,
    }),
    signal: params.signal,
  })

  const candidate = response.candidates?.[0]
  return {
    outputText: extractGeminiText(candidate?.content?.parts),
    results: collectGeminiFileSearchResults(candidate?.groundingMetadata),
  }
}
