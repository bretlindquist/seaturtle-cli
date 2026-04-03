export type ClaudeAiOAuthData = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scopes: string[]
  subscriptionType?: string | null
  rateLimitTier?: string | null
}

export type ProviderAuthMode = 'oauth' | 'api_key' | 'token'

export type ProviderOAuthProfile = {
  profileId: string
  provider: string
  mode: 'oauth'
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scopes?: string[]
  label?: string
  emailAddress?: string
  accountUuid?: string
  organizationUuid?: string
  metadata?: Record<string, unknown>
  updatedAt: number
}

export type ProviderApiKeyProfile = {
  profileId: string
  provider: string
  mode: 'api_key'
  apiKey: string
  label?: string
  metadata?: Record<string, unknown>
  updatedAt: number
}

export type ProviderTokenProfile = {
  profileId: string
  provider: string
  mode: 'token'
  token: string
  label?: string
  metadata?: Record<string, unknown>
  updatedAt: number
}

export type ProviderAuthProfile =
  | ProviderOAuthProfile
  | ProviderApiKeyProfile
  | ProviderTokenProfile

export type ProviderAuthProfileStore = {
  profiles: Record<string, ProviderAuthProfile>
  defaultProfiles?: Record<string, string>
}

export type SecureStorageData = {
  claudeAiOauth?: ClaudeAiOAuthData
  trustedDeviceToken?: string
  providerAuthProfiles?: ProviderAuthProfileStore
  [key: string]: unknown
}

export type SecureStorage = {
  name: string
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}
