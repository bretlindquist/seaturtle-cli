import {
  loginOpenAICodex,
  refreshOpenAICodexToken,
  type OAuthPrompt,
} from '@mariozechner/pi-ai/oauth'
import type { ProviderOAuthProfile } from '../../utils/secureStorage/types.js'
import { logError } from '../../utils/log.js'
import {
  buildOpenAiCodexOAuthProfile,
  getDefaultOpenAiCodexOAuthProfile,
  readExternalCodexCliAuth,
  saveProviderAuthProfile,
} from './store.js'

export type OpenAiCodexNativeAuth = {
  accessToken: string
  accountId: string
  source: 'provider-auth-profile' | 'codex-cli'
  profileId?: string
  emailAddress?: string
}

export type OpenAiCodexOAuthFlowHandlers = {
  onAuth?(info: { url: string; instructions?: string }): void
  onPrompt(prompt: OAuthPrompt): Promise<string>
  onProgress?(message: string): void
  onManualCodeInput?(): Promise<string>
  signal?: AbortSignal
}

function getStoredAccountId(profile: ProviderOAuthProfile): string | null {
  const metadataAccountId =
    typeof profile.metadata?.accountId === 'string'
      ? profile.metadata.accountId
      : null

  if (metadataAccountId && metadataAccountId.length > 0) {
    return metadataAccountId
  }

  return typeof profile.accountUuid === 'string' && profile.accountUuid.length > 0
    ? profile.accountUuid
    : null
}

function isExpiredOrNearExpiry(expiresAt: number | null | undefined): boolean {
  if (!expiresAt || !Number.isFinite(expiresAt)) {
    return false
  }

  return expiresAt <= Date.now() + 60_000
}

export async function loginWithOpenAiCodexOAuth(
  handlers: OpenAiCodexOAuthFlowHandlers,
): Promise<ProviderOAuthProfile> {
  const credentials = await loginOpenAICodex({
    onAuth: handlers.onAuth ?? (() => {}),
    onPrompt: handlers.onPrompt,
    onProgress: handlers.onProgress,
    onManualCodeInput: handlers.onManualCodeInput,
    originator: 'seaturtle',
  })

  const profile = buildOpenAiCodexOAuthProfile({
    accessToken: credentials.access,
    refreshToken: credentials.refresh,
    expiresAt: credentials.expires,
    accountId:
      typeof credentials.accountId === 'string' ? credentials.accountId : '',
    emailAddress:
      typeof credentials.email === 'string' ? credentials.email : undefined,
    enterpriseUrl:
      typeof credentials.enterpriseUrl === 'string'
        ? credentials.enterpriseUrl
        : undefined,
    projectId:
      typeof credentials.projectId === 'string'
        ? credentials.projectId
        : undefined,
  })

  const saveResult = saveProviderAuthProfile({
    profile,
    setAsDefault: true,
  })

  if (!saveResult.success) {
    throw new Error(
      saveResult.warning ??
        'OpenAI/Codex OAuth completed, but CT could not save the native auth profile.',
    )
  }

  return profile
}

export async function refreshOpenAiCodexOAuthProfile(
  profile: ProviderOAuthProfile,
): Promise<ProviderOAuthProfile> {
  if (!profile.refreshToken) {
    throw new Error('OpenAI/Codex OAuth profile is missing a refresh token.')
  }

  const refreshed = await refreshOpenAICodexToken(profile.refreshToken)
  const refreshedProfile = buildOpenAiCodexOAuthProfile({
    accessToken: refreshed.access,
    refreshToken: refreshed.refresh,
    expiresAt: refreshed.expires,
    accountId:
      typeof refreshed.accountId === 'string'
        ? refreshed.accountId
        : getStoredAccountId(profile) ?? '',
    emailAddress: profile.emailAddress,
    enterpriseUrl:
      typeof profile.metadata?.enterpriseUrl === 'string'
        ? profile.metadata.enterpriseUrl
        : undefined,
    projectId:
      typeof profile.metadata?.projectId === 'string'
        ? profile.metadata.projectId
        : undefined,
  })

  const saveResult = saveProviderAuthProfile({
    profile: refreshedProfile,
    setAsDefault: true,
  })

  if (!saveResult.success) {
    throw new Error(
      saveResult.warning ??
        'OpenAI/Codex OAuth token refreshed, but CT could not persist the updated profile.',
    )
  }

  return refreshedProfile
}

export async function getUsableOpenAiCodexAuth(): Promise<OpenAiCodexNativeAuth | null> {
  const nativeProfile = getDefaultOpenAiCodexOAuthProfile()
  if (nativeProfile) {
    const storedAccountId = getStoredAccountId(nativeProfile)
    if (storedAccountId) {
      try {
        const activeProfile = isExpiredOrNearExpiry(nativeProfile.expiresAt)
          ? await refreshOpenAiCodexOAuthProfile(nativeProfile)
          : nativeProfile
        const accountId = getStoredAccountId(activeProfile)
        if (accountId) {
          return {
            accessToken: activeProfile.accessToken,
            accountId,
            source: 'provider-auth-profile',
            profileId: activeProfile.profileId,
            emailAddress: activeProfile.emailAddress,
          }
        }
      } catch (error) {
        logError(error)
      }
    }
  }

  const fallback = readExternalCodexCliAuth()
  if (!fallback) {
    return null
  }

  return {
    accessToken: fallback.accessToken,
    accountId: fallback.accountId,
    source: 'codex-cli',
  }
}
