import {
  getDefaultOpenAiCodexApiKeyProfile,
} from './store.js'
import {
  getUsableOpenAiCodexAuth as getUsableOpenAiCodexOAuthOrCliAuth,
} from './openaiCodexOAuth.js'
import {
  resolveOpenAiCodexApiKeyAuthFromEnv,
  type OpenAiCodexApiKeyAuth,
} from './openaiCodexAuthCore.js'

const DEFAULT_CHATGPT_CODEX_BASE_URL = 'https://chatgpt.com/backend-api/codex'

export type OpenAiCodexResolvedAuth =
  | {
      mode: 'oauth'
      source: 'provider-auth-profile' | 'codex-cli'
      accessToken: string
      accountId: string
      profileId?: string
      emailAddress?: string
      baseUrl: string
    }
  | OpenAiCodexApiKeyAuth

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getStoredOpenAiCodexApiKeyAuth():
  | Extract<OpenAiCodexResolvedAuth, { mode: 'api_key' }>
  | null {
  const profile = getDefaultOpenAiCodexApiKeyProfile()
  if (!profile) {
    return null
  }

  return {
    mode: 'api_key',
    source: 'provider-api-key-profile',
    apiKey: profile.apiKey,
    organizationId:
      typeof profile.metadata?.organizationId === 'string'
        ? profile.metadata.organizationId
        : undefined,
    projectId:
      typeof profile.metadata?.projectId === 'string'
        ? profile.metadata.projectId
        : undefined,
    baseUrl:
      typeof profile.metadata?.baseUrl === 'string' &&
      profile.metadata.baseUrl.trim().length > 0
        ? profile.metadata.baseUrl.replace(/\/+$/, '')
        : 'https://api.openai.com/v1',
    label: profile.label,
  }
}

export async function getResolvedOpenAiCodexAuth(): Promise<OpenAiCodexResolvedAuth | null> {
  const storedApiKeyAuth = getStoredOpenAiCodexApiKeyAuth()
  if (storedApiKeyAuth) {
    return storedApiKeyAuth
  }

  const envApiKeyAuth = resolveOpenAiCodexApiKeyAuthFromEnv()
  if (envApiKeyAuth) {
    return envApiKeyAuth
  }

  const oauthOrCliAuth = await getUsableOpenAiCodexOAuthOrCliAuth()
  if (!oauthOrCliAuth) {
    return null
  }

  return {
    mode: 'oauth',
    source: oauthOrCliAuth.source,
    accessToken: oauthOrCliAuth.accessToken,
    accountId: oauthOrCliAuth.accountId,
    profileId: oauthOrCliAuth.profileId,
    emailAddress: oauthOrCliAuth.emailAddress,
    baseUrl: (
      trimOptional(process.env.CODEX_CHATGPT_BASE_URL) ??
      DEFAULT_CHATGPT_CODEX_BASE_URL
    ).replace(/\/+$/, ''),
  }
}
