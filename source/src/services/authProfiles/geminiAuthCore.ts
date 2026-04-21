const DEFAULT_GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta'

export type GeminiResolvedApiKeyAuth = {
  mode: 'api_key'
  source: 'provider-api-key-profile' | 'GEMINI_API_KEY'
  apiKey: string
  baseUrl: string
  label?: string
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function normalizeGeminiApiBaseUrl(baseUrl?: string): string {
  return (
    trimOptional(baseUrl) ?? DEFAULT_GEMINI_API_BASE_URL
  ).replace(/\/+$/, '')
}

export function resolveGeminiApiKeyAuthFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): GeminiResolvedApiKeyAuth | null {
  const apiKey = env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return null
  }

  return {
    mode: 'api_key',
    source: 'GEMINI_API_KEY',
    apiKey,
    baseUrl: normalizeGeminiApiBaseUrl(env.GEMINI_BASE_URL),
  }
}
