import {
  loginOpenAICodex,
  refreshOpenAICodexToken,
  type OAuthPrompt,
} from '@mariozechner/pi-ai/oauth'
import { decodeJwtExpiry, decodeJwtPayload } from '../../bridge/jwtUtils.js'
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

function getEmailFromJwt(token: string | undefined): string | undefined {
  if (!token) {
    return undefined
  }

  const payload = decodeJwtPayload(token)
  if (
    payload &&
    typeof payload === 'object' &&
    'email' in payload &&
    typeof payload.email === 'string'
  ) {
    return payload.email
  }

  return undefined
}

function getExpiryFromJwt(token: string | undefined): number | null {
  if (!token) {
    return null
  }

  const exp = decodeJwtExpiry(token)
  return typeof exp === 'number' ? exp * 1000 : null
}

function getPlanTypeFromJwt(token: string | undefined): string | undefined {
  if (!token) {
    return undefined
  }

  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  if (
    'chatgpt_plan_type' in payload &&
    typeof payload.chatgpt_plan_type === 'string'
  ) {
    return payload.chatgpt_plan_type
  }

  const namespacedAuth =
    'https://api.openai.com/auth' in payload &&
    payload['https://api.openai.com/auth'] &&
    typeof payload['https://api.openai.com/auth'] === 'object'
      ? payload['https://api.openai.com/auth']
      : null

  if (
    namespacedAuth &&
    'chatgpt_plan_type' in namespacedAuth &&
    typeof namespacedAuth.chatgpt_plan_type === 'string'
  ) {
    return namespacedAuth.chatgpt_plan_type
  }

  if ('plan_type' in payload && typeof payload.plan_type === 'string') {
    return payload.plan_type
  }

  return undefined
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
    planType: getPlanTypeFromJwt(credentials.access),
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
    planType:
      getPlanTypeFromJwt(refreshed.access) ??
      (typeof profile.metadata?.planType === 'string'
        ? profile.metadata.planType
        : undefined),
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

export function importExternalCodexCliAuthProfile(): {
  success: boolean
  warning?: string
  profile?: ProviderOAuthProfile
} {
  const fallback = readExternalCodexCliAuth()
  if (!fallback?.refreshToken) {
    return {
      success: false,
      warning:
        'CT found ~/.codex/auth.json, but it does not contain a refresh token that can be imported into native provider auth storage.',
    }
  }

  const importedProfile = buildOpenAiCodexOAuthProfile({
    accessToken: fallback.accessToken,
    refreshToken: fallback.refreshToken,
    expiresAt: getExpiryFromJwt(fallback.idToken),
    accountId: fallback.accountId,
    emailAddress: getEmailFromJwt(fallback.idToken),
    planType: getPlanTypeFromJwt(fallback.idToken),
  })

  const saveResult = saveProviderAuthProfile({
    profile: {
      ...importedProfile,
      metadata: {
        ...importedProfile.metadata,
        source: 'imported_codex_cli_auth',
      },
    },
    setAsDefault: true,
  })

  if (!saveResult.success) {
    return {
      success: false,
      warning:
        saveResult.warning ??
        'CT found existing Codex CLI auth, but could not import it into native provider auth storage.',
    }
  }

  return {
    success: true,
    warning: saveResult.warning,
    profile: importedProfile,
  }
}

export function maybeAdoptExternalCodexCliAuthProfile(): boolean {
  const nativeProfile = getDefaultOpenAiCodexOAuthProfile()
  if (nativeProfile) {
    const fallback = readExternalCodexCliAuth()
    const fallbackEmail = getEmailFromJwt(fallback?.idToken)
    const fallbackPlanType =
      getPlanTypeFromJwt(nativeProfile.accessToken) ??
      getPlanTypeFromJwt(fallback?.accessToken) ??
      getPlanTypeFromJwt(fallback?.idToken)
    const hasStoredPlanType =
      typeof nativeProfile.metadata?.planType === 'string' &&
      nativeProfile.metadata.planType.length > 0
    const needsBackfill =
      (!!fallbackEmail && !nativeProfile.emailAddress) ||
      (!!fallbackPlanType && !hasStoredPlanType)

    if (needsBackfill) {
      saveProviderAuthProfile({
        profile: {
          ...nativeProfile,
          emailAddress: nativeProfile.emailAddress ?? fallbackEmail,
          metadata: {
            ...nativeProfile.metadata,
            planType:
              hasStoredPlanType
                ? nativeProfile.metadata?.planType
                : fallbackPlanType ?? null,
          },
        },
        setAsDefault: true,
      })
    }

    return true
  }

  const importResult = importExternalCodexCliAuthProfile()
  if (!importResult.success) {
    return false
  }

  return true
}

export async function getUsableOpenAiCodexAuth(): Promise<OpenAiCodexNativeAuth | null> {
  maybeAdoptExternalCodexCliAuthProfile()
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
