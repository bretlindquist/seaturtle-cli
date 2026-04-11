import { homedir } from 'os'
import { join } from 'path'
import type { AccountInfo } from '../../utils/config.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { logError } from '../../utils/log.js'
import { expandPath } from '../../utils/path.js'
import { getSecureStorage } from '../../utils/secureStorage/index.js'
import type {
  ProviderAuthMode,
  ProviderAuthProfile,
  ProviderApiKeyProfile,
  ProviderAuthProfileStore,
  ProviderOAuthProfile,
  SecureStorageData,
} from '../../utils/secureStorage/types.js'

export const ANTHROPIC_CLAUDE_AI_PROFILE_ID = 'anthropic:claude-ai'
export const OPENAI_CODEX_PROVIDER = 'openai-codex'

export type ProviderAuthReadiness = {
  provider: string
  hasDefaultProfile: boolean
  hasAnyProfile: boolean
  profileCount: number
  profileModes: ProviderAuthMode[]
  externalSources: string[]
  readyViaProfile: boolean
  readyViaExternal: boolean
  ready: boolean
}

export type ExternalCodexCliAuth = {
  accessToken: string
  accountId: string
  refreshToken?: string
  idToken?: string
}

export type OpenAiCodexOAuthCredentialFields = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  accountId: string
  emailAddress?: string
  planType?: string
  enterpriseUrl?: string
  projectId?: string
}

export type OpenAiCodexApiKeyCredentialFields = {
  apiKey: string
  label?: string
  organizationId?: string
  projectId?: string
  baseUrl?: string
}

function emptyStore(): ProviderAuthProfileStore {
  return {
    profiles: {},
    defaultProfiles: {},
  }
}

function resolveCodexHomePath(): string {
  return process.env.CODEX_HOME
    ? expandPath(process.env.CODEX_HOME)
    : join(homedir(), '.codex')
}

function resolveCodexAuthPath(): string {
  return join(resolveCodexHomePath(), 'auth.json')
}

type CodexCliAuthFile = {
  tokens?: {
    access_token?: unknown
    account_id?: unknown
    refresh_token?: unknown
    id_token?: unknown
  }
}

export function normalizeProviderAuthProfileStore(
  store: ProviderAuthProfileStore | null | undefined,
): ProviderAuthProfileStore {
  if (!store || typeof store !== 'object') {
    return emptyStore()
  }

  return {
    profiles:
      store.profiles && typeof store.profiles === 'object' ? store.profiles : {},
    defaultProfiles:
      store.defaultProfiles && typeof store.defaultProfiles === 'object'
        ? store.defaultProfiles
        : {},
  }
}

export function buildAnthropicClaudeAiAuthProfile(params: {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scopes: string[]
  subscriptionType?: string | null
  rateLimitTier?: string | null
  account?: AccountInfo
}): ProviderOAuthProfile {
  return {
    profileId: ANTHROPIC_CLAUDE_AI_PROFILE_ID,
    provider: 'anthropic',
    mode: 'oauth',
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    expiresAt: params.expiresAt,
    scopes: params.scopes,
    label: 'Claude.ai OAuth',
    emailAddress: params.account?.emailAddress,
    accountUuid: params.account?.accountUuid,
    organizationUuid: params.account?.organizationUuid,
    metadata: {
      source: 'claude_ai_oauth',
      subscriptionType: params.subscriptionType ?? null,
      rateLimitTier: params.rateLimitTier ?? null,
    },
    updatedAt: Date.now(),
  }
}

export function buildOpenAiCodexOAuthProfile(
  params: OpenAiCodexOAuthCredentialFields,
): ProviderOAuthProfile {
  const profileName =
    params.emailAddress?.trim() ||
    params.accountId.trim() ||
    'default'

  return {
    profileId: `${OPENAI_CODEX_PROVIDER}:${profileName}`,
    provider: OPENAI_CODEX_PROVIDER,
    mode: 'oauth',
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    expiresAt: params.expiresAt,
    label: 'OpenAI Codex OAuth',
    emailAddress: params.emailAddress,
    accountUuid: params.accountId,
    metadata: {
      source: 'native_openai_codex_oauth',
      accountId: params.accountId,
      planType: params.planType ?? null,
      enterpriseUrl: params.enterpriseUrl ?? null,
      projectId: params.projectId ?? null,
    },
    updatedAt: Date.now(),
  }
}

export function buildOpenAiCodexApiKeyProfile(
  params: OpenAiCodexApiKeyCredentialFields,
): ProviderApiKeyProfile {
  const label =
    params.label?.trim() ||
    (params.projectId
      ? `OpenAI API key (${params.projectId})`
      : 'OpenAI API key')

  return {
    profileId: `${OPENAI_CODEX_PROVIDER}:api-key:${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'default'}`,
    provider: OPENAI_CODEX_PROVIDER,
    mode: 'api_key',
    apiKey: params.apiKey,
    label,
    metadata: {
      source: 'openai_api_key',
      organizationId: params.organizationId ?? null,
      projectId: params.projectId ?? null,
      baseUrl: params.baseUrl ?? null,
    },
    updatedAt: Date.now(),
  }
}

export function upsertProviderAuthProfileInStore(params: {
  store: ProviderAuthProfileStore | null | undefined
  profile: ProviderAuthProfile
  setAsDefault?: boolean
}): ProviderAuthProfileStore {
  const nextStore = normalizeProviderAuthProfileStore(params.store)
  nextStore.profiles = {
    ...nextStore.profiles,
    [params.profile.profileId]: params.profile,
  }

  if (params.setAsDefault) {
    nextStore.defaultProfiles = {
      ...nextStore.defaultProfiles,
      [params.profile.provider]: params.profile.profileId,
    }
  }

  return nextStore
}

export function removeProviderAuthProfileFromStore(params: {
  store: ProviderAuthProfileStore | null | undefined
  profileId: string
}): ProviderAuthProfileStore {
  const nextStore = normalizeProviderAuthProfileStore(params.store)
  if (!nextStore.profiles[params.profileId]) {
    return nextStore
  }

  const profile = nextStore.profiles[params.profileId]
  const remainingProfiles = { ...nextStore.profiles }
  delete remainingProfiles[params.profileId]

  const nextDefaultProfiles = { ...nextStore.defaultProfiles }
  if (profile && nextDefaultProfiles[profile.provider] === params.profileId) {
    delete nextDefaultProfiles[profile.provider]
  }

  return {
    profiles: remainingProfiles,
    defaultProfiles: nextDefaultProfiles,
  }
}

export function readProviderAuthProfileStore(): ProviderAuthProfileStore {
  try {
    const secureStorage = getSecureStorage()
    const storageData = secureStorage.read()
    return normalizeProviderAuthProfileStore(storageData?.providerAuthProfiles)
  } catch (error) {
    logError(error)
    return emptyStore()
  }
}

export function getProviderAuthProfile(
  profileId: string,
): ProviderAuthProfile | undefined {
  return readProviderAuthProfileStore().profiles[profileId]
}

export function getDefaultProviderAuthProfile(
  provider: string,
): ProviderAuthProfile | undefined {
  const store = readProviderAuthProfileStore()
  const profileId = store.defaultProfiles?.[provider]
  return profileId ? store.profiles[profileId] : undefined
}

export function getDefaultProviderOAuthProfile(
  provider: string,
): ProviderOAuthProfile | undefined {
  const profile = getDefaultProviderAuthProfile(provider)
  return profile?.mode === 'oauth' ? profile : undefined
}

export function getDefaultProviderApiKeyProfile(
  provider: string,
): ProviderApiKeyProfile | undefined {
  const profile = getDefaultProviderAuthProfile(provider)
  return profile?.mode === 'api_key' ? profile : undefined
}

export function hasProviderAuthProfile(
  provider: string,
  mode?: ProviderAuthMode,
): boolean {
  return listProviderAuthProfiles(provider).some(
    profile => !mode || profile.mode === mode,
  )
}

export function hasDefaultProviderAuthProfile(
  provider: string,
  mode?: ProviderAuthMode,
): boolean {
  const profile = getDefaultProviderAuthProfile(provider)
  return !!profile && (!mode || profile.mode === mode)
}

export function listProviderAuthProfiles(provider?: string): ProviderAuthProfile[] {
  const store = readProviderAuthProfileStore()
  const profiles = Object.values(store.profiles)
  return provider ? profiles.filter(profile => profile.provider === provider) : profiles
}

export function hasExternalCodexCliAuth(): boolean {
  try {
    return getFsImplementation().existsSync(resolveCodexAuthPath())
  } catch (error) {
    logError(error)
    return false
  }
}

export function readExternalCodexCliAuth(): ExternalCodexCliAuth | null {
  try {
    const authPath = resolveCodexAuthPath()
    if (!getFsImplementation().existsSync(authPath)) {
      return null
    }

    const raw = getFsImplementation().readFileSync(authPath, {
      encoding: 'utf8',
    })
    const parsed = JSON.parse(raw) as CodexCliAuthFile
    const accessToken =
      typeof parsed.tokens?.access_token === 'string'
        ? parsed.tokens.access_token
        : null
    const accountId =
      typeof parsed.tokens?.account_id === 'string'
        ? parsed.tokens.account_id
        : null
    const refreshToken =
      typeof parsed.tokens?.refresh_token === 'string'
        ? parsed.tokens.refresh_token
        : null
    const idToken =
      typeof parsed.tokens?.id_token === 'string'
        ? parsed.tokens.id_token
        : null

    if (!accessToken || !accountId) {
      return null
    }

    return {
      accessToken,
      accountId,
      refreshToken: refreshToken ?? undefined,
      idToken: idToken ?? undefined,
    }
  } catch (error) {
    logError(error)
    return null
  }
}

export function getProviderAuthReadiness(
  provider: string,
): ProviderAuthReadiness {
  const profiles = listProviderAuthProfiles(provider)
  const profileModes = Array.from(new Set(profiles.map(profile => profile.mode)))
  const externalSources =
    provider === OPENAI_CODEX_PROVIDER && hasExternalCodexCliAuth()
      ? ['codex-cli']
      : []
  const readyViaProfile = profiles.length > 0
  const readyViaExternal =
    provider === OPENAI_CODEX_PROVIDER && externalSources.length > 0

  return {
    provider,
    hasDefaultProfile: hasDefaultProviderAuthProfile(provider),
    hasAnyProfile: readyViaProfile,
    profileCount: profiles.length,
    profileModes,
    externalSources,
    readyViaProfile,
    readyViaExternal,
    ready: readyViaProfile || readyViaExternal,
  }
}

export function getOpenAiCodexAuthReadiness(): ProviderAuthReadiness {
  return getProviderAuthReadiness(OPENAI_CODEX_PROVIDER)
}

export function getDefaultOpenAiCodexOAuthProfile():
  | ProviderOAuthProfile
  | undefined {
  return getDefaultProviderOAuthProfile(OPENAI_CODEX_PROVIDER)
}

export function getDefaultOpenAiCodexApiKeyProfile():
  | ProviderApiKeyProfile
  | undefined {
  return getDefaultProviderApiKeyProfile(OPENAI_CODEX_PROVIDER)
}

export function saveProviderAuthProfileStore(
  store: ProviderAuthProfileStore,
): { success: boolean; warning?: string } {
  try {
    const secureStorage = getSecureStorage()
    const storageData: SecureStorageData = secureStorage.read() || {}
    storageData.providerAuthProfiles = normalizeProviderAuthProfileStore(store)
    return secureStorage.update(storageData)
  } catch (error) {
    logError(error)
    return { success: false }
  }
}

export function saveProviderAuthProfile(params: {
  profile: ProviderAuthProfile
  setAsDefault?: boolean
}): { success: boolean; warning?: string } {
  const store = upsertProviderAuthProfileInStore({
    store: readProviderAuthProfileStore(),
    profile: params.profile,
    setAsDefault: params.setAsDefault,
  })
  return saveProviderAuthProfileStore(store)
}

export function clearProviderAuthProfiles(params?: {
  provider?: string
  mode?: ProviderAuthMode
}): { success: boolean; warning?: string } {
  try {
    const secureStorage = getSecureStorage()
    const storageData: SecureStorageData = secureStorage.read() || {}
    const store = normalizeProviderAuthProfileStore(storageData.providerAuthProfiles)

    if (!params?.provider && !params?.mode) {
      storageData.providerAuthProfiles = emptyStore()
      return secureStorage.update(storageData)
    }

    const nextStore = emptyStore()
    for (const [profileId, profile] of Object.entries(store.profiles)) {
      const providerMatches = !params.provider || profile.provider === params.provider
      const modeMatches = !params.mode || profile.mode === params.mode
      if (providerMatches && modeMatches) {
        continue
      }
      nextStore.profiles[profileId] = profile
      if (store.defaultProfiles?.[profile.provider] === profileId) {
        nextStore.defaultProfiles = {
          ...nextStore.defaultProfiles,
          [profile.provider]: profileId,
        }
      }
    }

    storageData.providerAuthProfiles = nextStore
    return secureStorage.update(storageData)
  } catch (error) {
    logError(error)
    return { success: false }
  }
}
