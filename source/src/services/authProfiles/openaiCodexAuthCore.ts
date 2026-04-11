const DEFAULT_OPENAI_API_BASE_URL = 'https://api.openai.com/v1'

export type OpenAiCodexApiKeyAuth = {
  mode: 'api_key'
  source: 'provider-api-key-profile' | 'OPENAI_API_KEY'
  apiKey: string
  organizationId?: string
  projectId?: string
  baseUrl: string
  label?: string
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function resolveOpenAiApiBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (trimOptional(env.OPENAI_BASE_URL) ?? DEFAULT_OPENAI_API_BASE_URL).replace(
    /\/+$/,
    '',
  )
}

export function resolveOpenAiCodexApiKeyAuthFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiCodexApiKeyAuth | null {
  const apiKey = trimOptional(env.OPENAI_API_KEY)
  if (!apiKey) {
    return null
  }

  return {
    mode: 'api_key',
    source: 'OPENAI_API_KEY',
    apiKey,
    organizationId: trimOptional(env.OPENAI_ORGANIZATION),
    projectId: trimOptional(env.OPENAI_PROJECT),
    baseUrl: resolveOpenAiApiBaseUrl(env),
  }
}
