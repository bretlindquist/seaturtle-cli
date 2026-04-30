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
  saveExternalCodexCliAuth,
  saveProviderAuthProfile,
} from './store.js'
import { createServer } from 'node:http'

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

export type OpenAiCodexOAuthProfileIdentity = {
  accountId: string | null
  accountLabel: string | null
  emailAddress?: string
  planType?: string
}

const OPENAI_CODEX_CALLBACK_PORT = 1455

export type OpenAiCodexOAuthLoginPreparation =
  | { kind: 'native' }
  | { kind: 'import-existing-codex-cli'; message: string }
  | { kind: 'blocked'; message: string }

function trimOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
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
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  if ('email' in payload && typeof payload.email === 'string') {
    return payload.email
  }

  const namespacedProfile =
    'https://api.openai.com/profile' in payload &&
    payload['https://api.openai.com/profile'] &&
    typeof payload['https://api.openai.com/profile'] === 'object'
      ? payload['https://api.openai.com/profile']
      : null

  if (
    namespacedProfile &&
    'email' in namespacedProfile &&
    typeof namespacedProfile.email === 'string'
  ) {
    return namespacedProfile.email
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

export async function canBindOpenAiCodexCallbackPort(
  port: number = OPENAI_CODEX_CALLBACK_PORT,
): Promise<boolean> {
  return await new Promise<boolean>(resolve => {
    const testServer = createServer()

    testServer.once('error', () => {
      resolve(false)
    })

    testServer.listen(port, '127.0.0.1', () => {
      testServer.close(() => resolve(true))
    })
  })
}

export async function resolveOpenAiCodexOAuthLoginPreparation(options?: {
  callbackPort?: number
  externalCodexCliAuthReady?: boolean
}): Promise<OpenAiCodexOAuthLoginPreparation> {
  const callbackPort = options?.callbackPort ?? OPENAI_CODEX_CALLBACK_PORT
  const externalCodexCliAuthReady =
    options?.externalCodexCliAuthReady ?? !!readExternalCodexCliAuth()?.refreshToken
  const callbackPortAvailable =
    await canBindOpenAiCodexCallbackPort(callbackPort)

  if (callbackPortAvailable) {
    return { kind: 'native' }
  }

  if (externalCodexCliAuthReady) {
    return {
      kind: 'import-existing-codex-cli',
      message:
        `CT could not claim localhost:${callbackPort} for native OpenAI/Codex OAuth. ` +
        'Using the existing Codex CLI OAuth from ~/.codex/auth.json instead of starting a second browser flow.',
    }
  }

  return {
    kind: 'blocked',
    message:
      `OpenAI/Codex native login cannot start because localhost:${callbackPort} is already in use. ` +
      'This callback port is required for ChatGPT OAuth. If you just ran codex login, go back and choose "Use existing Codex OAuth". Otherwise close the process listening on that port and try again.',
  }
}

export function resolveOpenAiCodexOAuthProfileIdentity(
  profile: ProviderOAuthProfile | null | undefined,
  fallback?: {
    accessToken?: string
    idToken?: string
    accountId?: string | null
  },
): OpenAiCodexOAuthProfileIdentity {
  const accountId =
    (profile ? getStoredAccountId(profile) : null) ??
    trimOptionalString(fallback?.accountId) ??
    null
  const emailAddress =
    getEmailFromJwt(profile?.accessToken) ??
    getEmailFromJwt(fallback?.accessToken) ??
    getEmailFromJwt(fallback?.idToken) ??
    trimOptionalString(profile?.emailAddress)
  const storedPlanType = trimOptionalString(profile?.metadata?.planType)
  const planType =
    getPlanTypeFromJwt(profile?.accessToken) ??
    getPlanTypeFromJwt(fallback?.accessToken) ??
    getPlanTypeFromJwt(fallback?.idToken) ??
    storedPlanType

  return {
    accountId,
    accountLabel: emailAddress ?? accountId,
    emailAddress,
    planType,
  }
}

export async function loginWithOpenAiCodexOAuth(
  handlers: OpenAiCodexOAuthFlowHandlers,
): Promise<ProviderOAuthProfile> {
  const loginPreparation = await resolveOpenAiCodexOAuthLoginPreparation()

  if (loginPreparation.kind === 'import-existing-codex-cli') {
    handlers.onProgress?.(loginPreparation.message)
    const importResult = importExternalCodexCliAuthProfile()
    if (!importResult.success || !importResult.profile) {
      throw new Error(
        importResult.warning ??
          'CT detected existing Codex CLI auth, but could not import it into native provider auth storage.',
      )
    }
    return importResult.profile
  }

  if (loginPreparation.kind === 'blocked') {
    throw new Error(loginPreparation.message)
  }

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
  const storedIdentity = resolveOpenAiCodexOAuthProfileIdentity(profile)
  const refreshedProfile = buildOpenAiCodexOAuthProfile({
    accessToken: refreshed.access,
    refreshToken: refreshed.refresh,
    expiresAt: refreshed.expires,
    accountId:
      trimOptionalString(refreshed.accountId) ?? storedIdentity.accountId ?? '',
    emailAddress:
      getEmailFromJwt(refreshed.access) ?? storedIdentity.emailAddress,
    planType:
      getPlanTypeFromJwt(refreshed.access) ?? storedIdentity.planType,
    enterpriseUrl:
      typeof profile.metadata?.enterpriseUrl === 'string'
        ? profile.metadata.enterpriseUrl
        : undefined,
    projectId:
      typeof profile.metadata?.projectId === 'string'
        ? profile.metadata.projectId
        : undefined,
  })
  refreshedProfile.profileId = profile.profileId

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
    const resolvedIdentity = resolveOpenAiCodexOAuthProfileIdentity(
      nativeProfile,
      fallback
        ? {
            accessToken: fallback.accessToken,
            idToken: fallback.idToken,
            accountId: fallback.accountId,
          }
        : undefined,
    )
    const storedPlanType = trimOptionalString(nativeProfile.metadata?.planType)
    const needsBackfill =
      resolvedIdentity.accountId !== getStoredAccountId(nativeProfile) ||
      resolvedIdentity.emailAddress !== trimOptionalString(nativeProfile.emailAddress) ||
      resolvedIdentity.planType !== storedPlanType

    if (needsBackfill) {
      const updatedProfile: ProviderOAuthProfile = {
        ...nativeProfile,
        emailAddress: resolvedIdentity.emailAddress,
        accountUuid: resolvedIdentity.accountId ?? nativeProfile.accountUuid,
        metadata: {
          ...nativeProfile.metadata,
          accountId: resolvedIdentity.accountId ?? nativeProfile.metadata?.accountId ?? null,
          planType: resolvedIdentity.planType ?? null,
        },
        updatedAt: Date.now(),
      }
      saveProviderAuthProfile({
        profile: updatedProfile,
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
          const activeIdentity = resolveOpenAiCodexOAuthProfileIdentity(activeProfile)
          return {
            accessToken: activeProfile.accessToken,
            accountId,
            source: 'provider-auth-profile',
            profileId: activeProfile.profileId,
            emailAddress: activeIdentity.emailAddress,
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

  if (
    fallback.refreshToken &&
    isExpiredOrNearExpiry(getExpiryFromJwt(fallback.accessToken))
  ) {
    try {
      const refreshed = await refreshOpenAICodexToken(fallback.refreshToken)
      const refreshedAuth = {
        accessToken: refreshed.access,
        refreshToken: refreshed.refresh,
        accountId:
          typeof refreshed.accountId === 'string' && refreshed.accountId.length > 0
            ? refreshed.accountId
            : fallback.accountId,
        idToken: fallback.idToken,
      }
      saveExternalCodexCliAuth(refreshedAuth)
      return {
        accessToken: refreshedAuth.accessToken,
        accountId: refreshedAuth.accountId,
        source: 'codex-cli',
      }
    } catch (error) {
      logError(error)
    }
  }

  return {
    accessToken: fallback.accessToken,
    accountId: fallback.accountId,
    source: 'codex-cli',
  }
}
