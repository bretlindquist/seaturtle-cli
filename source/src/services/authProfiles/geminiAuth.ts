import {
  buildGeminiApiKeyProfile,
  clearProviderAuthProfiles,
  getDefaultGeminiApiKeyProfile,
  saveProviderAuthProfile,
} from './store.js'
import {
  normalizeGeminiApiBaseUrl,
  resolveGeminiApiKeyAuthFromEnv,
  type GeminiResolvedApiKeyAuth,
} from './geminiAuthCore.js'

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getStoredGeminiApiKeyAuth(): GeminiResolvedApiKeyAuth | null {
  const profile = getDefaultGeminiApiKeyProfile()
  if (!profile?.apiKey.trim()) {
    return null
  }

  return {
    mode: 'api_key',
    source: 'provider-api-key-profile',
    apiKey: profile.apiKey.trim(),
    baseUrl: normalizeGeminiApiBaseUrl(
      typeof profile.metadata?.baseUrl === 'string'
        ? profile.metadata.baseUrl
        : undefined,
    ),
    label: profile.label,
  }
}

export function getResolvedGeminiApiKeyAuth(): GeminiResolvedApiKeyAuth | null {
  return getStoredGeminiApiKeyAuth() ?? resolveGeminiApiKeyAuthFromEnv()
}

export function saveGeminiApiKeyProfile(params: {
  apiKey: string
  label?: string
  baseUrl?: string
}): {
  success: boolean
  warning?: string
  profileId?: string
} {
  const apiKey = params.apiKey.trim()
  if (!apiKey) {
    return {
      success: false,
      warning: 'Gemini API key is required.',
    }
  }

  const profile = buildGeminiApiKeyProfile({
    apiKey,
    ...(trimOptional(params.label) ? { label: trimOptional(params.label) } : {}),
    ...(trimOptional(params.baseUrl)
      ? { baseUrl: normalizeGeminiApiBaseUrl(params.baseUrl) }
      : {}),
  })

  const saveResult = saveProviderAuthProfile({
    profile,
    setAsDefault: true,
  })

  return {
    success: saveResult.success,
    warning: saveResult.warning,
    ...(saveResult.success ? { profileId: profile.profileId } : {}),
  }
}

export function clearGeminiApiKeyProfiles(): {
  success: boolean
  warning?: string
} {
  return clearProviderAuthProfiles({
    provider: 'gemini',
    mode: 'api_key',
  })
}
