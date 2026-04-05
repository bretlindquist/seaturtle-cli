import {
  getGlobalConfig,
  getProjectPathForConfig,
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
  saveGlobalConfig,
  type TelegramBotProfileMeta,
  type TelegramProjectBinding,
} from '../../utils/config.js'
import { logError } from '../../utils/log.js'
import { getSecureStorage } from '../../utils/secureStorage/index.js'
import type {
  SecureStorageData,
  TelegramBotSecret,
} from '../../utils/secureStorage/types.js'

export type TelegramConfig = {
  botToken: string
  allowedChatIds: Set<string>
  pollTimeoutSeconds: number
  profileId?: string
  defaultChatId?: string
  lastInboundChatId?: string
}

export type TelegramConfigSnapshot = {
  botTokenConfigured: boolean
  allowedChatIdsCount: number
  pollTimeoutSeconds: number
  ready: boolean
  source: 'none' | 'env' | 'project'
  envOverride: boolean
  profileId?: string
  botUsername?: string
  botDisplayName?: string
  projectPath?: string
  defaultChatId?: string
  lastPairedChatId?: string
  brokenReason?: string
}

export type TelegramAppConfig = {
  allowedChatIds: string[]
  pollTimeoutSeconds: number
  lastPairedChatId?: string
  botUsername?: string
  botDisplayName?: string
  pairedAt?: number
}

export type TelegramBotProfile = TelegramBotProfileMeta & {
  botTokenConfigured: boolean
}

export type TelegramProjectBindingUsage = {
  projectPath: string
  binding: TelegramProjectBinding
}

export type ResolvedTelegramConfigState = {
  source: 'none' | 'env' | 'project'
  envOverride: boolean
  botToken: string | null
  allowedChatIds: Set<string>
  pollTimeoutSeconds: number
  profileId?: string
  botUsername?: string
  botDisplayName?: string
  projectPath?: string
  defaultChatId?: string
  lastInboundChatId?: string
  brokenReason?: string
}

const DEFAULT_POLL_TIMEOUT_SECONDS = 20
const LEGACY_PROFILE_ID = 'legacy-default'

function parseAllowedChatIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set()
  }

  return new Set(
    raw
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  )
}

function parsePollTimeout(raw: string | undefined): number {
  const parsedTimeout = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsedTimeout) && parsedTimeout > 0
    ? parsedTimeout
    : DEFAULT_POLL_TIMEOUT_SECONDS
}

function normalizeChatIdList(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  return Array.from(
    new Set(
      values
        .map(value => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  )
}

function hasAnyTelegramEnvOverride(): boolean {
  return (
    typeof process.env.CLAUDE_CODE_TELEGRAM_BOT_TOKEN === 'string' ||
    typeof process.env.CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS === 'string' ||
    typeof process.env.CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC === 'string'
  )
}

function getSecureStorageData(): SecureStorageData | null {
  try {
    return getSecureStorage().read()
  } catch (error) {
    logError(error)
    return null
  }
}

function getStoredTelegramSecrets(): Record<string, TelegramBotSecret> {
  const storageData = getSecureStorageData()
  const profiles = storageData?.telegramProfiles
  const normalized: Record<string, TelegramBotSecret> = {}

  if (profiles && typeof profiles === 'object') {
    for (const [profileId, profile] of Object.entries(profiles)) {
      if (
        profile &&
        typeof profile.botToken === 'string' &&
        profile.botToken.trim()
      ) {
        normalized[profileId] = {
          botToken: profile.botToken.trim(),
          updatedAt:
            typeof profile.updatedAt === 'number'
              ? profile.updatedAt
              : Date.now(),
        }
      }
    }
  }

  const legacyToken = storageData?.telegram
  if (
    legacyToken &&
    typeof legacyToken.botToken === 'string' &&
    legacyToken.botToken.trim() &&
    !normalized[LEGACY_PROFILE_ID]
  ) {
    normalized[LEGACY_PROFILE_ID] = {
      botToken: legacyToken.botToken.trim(),
      updatedAt:
        typeof legacyToken.updatedAt === 'number'
          ? legacyToken.updatedAt
          : Date.now(),
    }
  }

  return normalized
}

function getStoredTelegramBotToken(profileId: string): string | null {
  const secret = getStoredTelegramSecrets()[profileId]
  return secret?.botToken || null
}

export function getTelegramBotProfileToken(profileId: string): string | null {
  return getStoredTelegramBotToken(profileId)
}

function normalizeTelegramProfileMeta(
  input: unknown,
): TelegramBotProfileMeta | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const profile = input as Record<string, unknown>
  if (typeof profile.profileId !== 'string' || !profile.profileId.trim()) {
    return null
  }

  return {
    profileId: profile.profileId,
    botUsername:
      typeof profile.botUsername === 'string' ? profile.botUsername : undefined,
    botDisplayName:
      typeof profile.botDisplayName === 'string'
        ? profile.botDisplayName
        : undefined,
    createdAt:
      typeof profile.createdAt === 'number' ? profile.createdAt : undefined,
    updatedAt:
      typeof profile.updatedAt === 'number' ? profile.updatedAt : Date.now(),
  }
}

function getTelegramProfileMetaMap(): Record<string, TelegramBotProfileMeta> {
  const globalConfig = getGlobalConfig()
  const rawProfiles = globalConfig.telegramProfiles
  const normalized: Record<string, TelegramBotProfileMeta> = {}

  if (rawProfiles && typeof rawProfiles === 'object') {
    for (const [profileId, profile] of Object.entries(rawProfiles)) {
      const normalizedProfile = normalizeTelegramProfileMeta({
        profileId,
        ...(profile as Record<string, unknown>),
      })
      if (normalizedProfile) {
        normalized[profileId] = normalizedProfile
      }
    }
  }

  const legacyConfig = globalConfig.telegram
  if (
    legacyConfig &&
    typeof legacyConfig === 'object' &&
    !normalized[LEGACY_PROFILE_ID]
  ) {
    normalized[LEGACY_PROFILE_ID] = {
      profileId: LEGACY_PROFILE_ID,
      botUsername:
        typeof legacyConfig.botUsername === 'string'
          ? legacyConfig.botUsername
          : undefined,
      botDisplayName:
        typeof legacyConfig.botDisplayName === 'string'
          ? legacyConfig.botDisplayName
          : undefined,
      createdAt:
        typeof legacyConfig.pairedAt === 'number'
          ? legacyConfig.pairedAt
          : Date.now(),
      updatedAt:
        typeof legacyConfig.pairedAt === 'number'
          ? legacyConfig.pairedAt
          : Date.now(),
    }
  }

  return normalized
}

function normalizeProjectBinding(
  input: unknown,
): TelegramProjectBinding | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const raw = input as Record<string, unknown>
  if (typeof raw.profileId !== 'string' || !raw.profileId.trim()) {
    return null
  }

  return {
    profileId: raw.profileId.trim(),
    allowedChatIds: normalizeChatIdList(
      Array.isArray(raw.allowedChatIds) ? raw.allowedChatIds : undefined,
    ),
    pollTimeoutSeconds:
      typeof raw.pollTimeoutSeconds === 'number' && raw.pollTimeoutSeconds > 0
        ? raw.pollTimeoutSeconds
        : DEFAULT_POLL_TIMEOUT_SECONDS,
    defaultChatId:
      typeof raw.defaultChatId === 'string' ? raw.defaultChatId : undefined,
    lastInboundChatId:
      typeof raw.lastInboundChatId === 'string'
        ? raw.lastInboundChatId
        : undefined,
    pairedAt: typeof raw.pairedAt === 'number' ? raw.pairedAt : undefined,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
  }
}

function normalizeLegacyTelegramAppConfig(): TelegramAppConfig | null {
  const rawConfig = getGlobalConfig().telegram
  if (!rawConfig || typeof rawConfig !== 'object') {
    return null
  }

  return {
    allowedChatIds: normalizeChatIdList(
      Array.isArray(rawConfig.allowedChatIds) ? rawConfig.allowedChatIds : [],
    ),
    pollTimeoutSeconds:
      typeof rawConfig.pollTimeoutSeconds === 'number' &&
      Number.isFinite(rawConfig.pollTimeoutSeconds) &&
      rawConfig.pollTimeoutSeconds > 0
        ? rawConfig.pollTimeoutSeconds
        : DEFAULT_POLL_TIMEOUT_SECONDS,
    lastPairedChatId:
      typeof rawConfig.lastPairedChatId === 'string'
        ? rawConfig.lastPairedChatId
        : undefined,
    botUsername:
      typeof rawConfig.botUsername === 'string'
        ? rawConfig.botUsername
        : undefined,
    botDisplayName:
      typeof rawConfig.botDisplayName === 'string'
        ? rawConfig.botDisplayName
        : undefined,
    pairedAt:
      typeof rawConfig.pairedAt === 'number' ? rawConfig.pairedAt : undefined,
  }
}

function getCurrentProjectTelegramBinding(): TelegramProjectBinding | null {
  return normalizeProjectBinding(getCurrentProjectConfig().telegram)
}

function getLegacyFallbackBinding(): TelegramProjectBinding | null {
  const appConfig = normalizeLegacyTelegramAppConfig()
  const token = getStoredTelegramBotToken(LEGACY_PROFILE_ID)
  if (!appConfig && !token) {
    return null
  }

  return {
    profileId: LEGACY_PROFILE_ID,
    allowedChatIds: appConfig?.allowedChatIds ?? [],
    pollTimeoutSeconds:
      appConfig?.pollTimeoutSeconds ?? DEFAULT_POLL_TIMEOUT_SECONDS,
    defaultChatId: appConfig?.lastPairedChatId,
    lastInboundChatId: appConfig?.lastPairedChatId,
    pairedAt: appConfig?.pairedAt,
    updatedAt: appConfig?.pairedAt,
  }
}

function resolveProjectBoundConfig(): ResolvedTelegramConfigState {
  const projectPath = getProjectPathForConfig()
  const projectBinding =
    getCurrentProjectTelegramBinding() ?? getLegacyFallbackBinding()
  const profileMetaMap = getTelegramProfileMetaMap()

  if (!projectBinding) {
    return {
      source: 'none',
      envOverride: false,
      botToken: null,
      allowedChatIds: new Set(),
      pollTimeoutSeconds: DEFAULT_POLL_TIMEOUT_SECONDS,
    }
  }

  const botToken = getStoredTelegramBotToken(projectBinding.profileId)
  const profileMeta = profileMetaMap[projectBinding.profileId]

  return {
    source: 'project',
    envOverride: false,
    botToken,
    allowedChatIds: new Set(projectBinding.allowedChatIds),
    pollTimeoutSeconds:
      projectBinding.pollTimeoutSeconds ?? DEFAULT_POLL_TIMEOUT_SECONDS,
    profileId: projectBinding.profileId,
    botUsername: profileMeta?.botUsername,
    botDisplayName: profileMeta?.botDisplayName,
    projectPath,
    defaultChatId:
      projectBinding.defaultChatId || projectBinding.lastInboundChatId,
    lastInboundChatId: projectBinding.lastInboundChatId,
    brokenReason: !botToken
      ? 'Bot token missing for bound Telegram profile'
      : projectBinding.allowedChatIds.length === 0
        ? 'No allowlisted Telegram chats configured for this project'
        : undefined,
  }
}

function getResolvedTelegramConfigState(): ResolvedTelegramConfigState {
  if (hasAnyTelegramEnvOverride()) {
    const botToken = process.env.CLAUDE_CODE_TELEGRAM_BOT_TOKEN?.trim() || null
    const allowedChatIds = parseAllowedChatIds(
      process.env.CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS,
    )
    return {
      source: 'env',
      envOverride: true,
      botToken,
      allowedChatIds,
      pollTimeoutSeconds: parsePollTimeout(
        process.env.CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC,
      ),
      brokenReason: !botToken
        ? 'Environment override is missing CLAUDE_CODE_TELEGRAM_BOT_TOKEN'
        : allowedChatIds.size === 0
          ? 'Environment override is missing CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS'
          : undefined,
    }
  }

  return resolveProjectBoundConfig()
}

export function getTelegramConfig(): TelegramConfig | null {
  const resolved = getResolvedTelegramConfigState()
  if (!resolved.botToken || resolved.allowedChatIds.size === 0) {
    return null
  }

  return {
    botToken: resolved.botToken,
    allowedChatIds: resolved.allowedChatIds,
    pollTimeoutSeconds: resolved.pollTimeoutSeconds,
    profileId: resolved.profileId,
    defaultChatId: resolved.defaultChatId,
    lastInboundChatId: resolved.lastInboundChatId,
  }
}

export function getTelegramConfigSnapshot(): TelegramConfigSnapshot {
  const resolved = getResolvedTelegramConfigState()

  return {
    botTokenConfigured: Boolean(resolved.botToken),
    allowedChatIdsCount: resolved.allowedChatIds.size,
    pollTimeoutSeconds: resolved.pollTimeoutSeconds,
    ready: Boolean(resolved.botToken) && resolved.allowedChatIds.size > 0,
    source: resolved.source,
    envOverride: resolved.envOverride,
    profileId: resolved.profileId,
    botUsername: resolved.botUsername,
    botDisplayName: resolved.botDisplayName,
    projectPath: resolved.projectPath,
    defaultChatId: resolved.defaultChatId,
    lastPairedChatId: resolved.lastInboundChatId,
    brokenReason: resolved.brokenReason,
  }
}

export function listTelegramBotProfiles(): TelegramBotProfile[] {
  const profileMetaMap = getTelegramProfileMetaMap()
  const secrets = getStoredTelegramSecrets()

  return Object.values(profileMetaMap)
    .map(profile => ({
      ...profile,
      botTokenConfigured: Boolean(secrets[profile.profileId]?.botToken),
    }))
    .sort((left, right) => {
      const leftLabel =
        left.botDisplayName || left.botUsername || left.profileId
      const rightLabel =
        right.botDisplayName || right.botUsername || right.profileId
      return leftLabel.localeCompare(rightLabel)
    })
}

export function getCurrentProjectTelegramBindingSnapshot():
  | TelegramProjectBinding
  | null {
  return getCurrentProjectTelegramBinding() ?? getLegacyFallbackBinding()
}

export function listTelegramProjectBindingsForProfile(
  profileId: string,
): TelegramProjectBindingUsage[] {
  const projects = getGlobalConfig().projects
  if (!projects) {
    return []
  }

  const usages: TelegramProjectBindingUsage[] = []
  for (const [projectPath, projectConfig] of Object.entries(projects)) {
    const binding = normalizeProjectBinding(projectConfig.telegram)
    if (binding?.profileId === profileId) {
      usages.push({ projectPath, binding })
    }
  }

  return usages
}

export function saveTelegramBotProfile(params: {
  profileId: string
  botToken: string
  botUsername?: string
  botDisplayName?: string
}): { success: boolean; warning?: string } {
  try {
    const now = Date.now()
    const secureStorage = getSecureStorage()
    const storageData: SecureStorageData = secureStorage.read() || {}
    storageData.telegramProfiles = {
      ...storageData.telegramProfiles,
      [params.profileId]: {
        botToken: params.botToken.trim(),
        updatedAt: now,
      },
    }
    delete storageData.telegram

    const secretResult = secureStorage.update(storageData)
    if (!secretResult.success) {
      return secretResult
    }

    saveGlobalConfig(current => ({
      ...current,
      telegramProfiles: {
        ...current.telegramProfiles,
        [params.profileId]: {
          profileId: params.profileId,
          botUsername: params.botUsername,
          botDisplayName: params.botDisplayName,
          createdAt:
            current.telegramProfiles?.[params.profileId]?.createdAt ?? now,
          updatedAt: now,
        },
      },
      telegram: undefined,
    }))

    return secretResult
  } catch (error) {
    logError(error)
    return { success: false }
  }
}

export function removeTelegramBotProfile(profileId: string): {
  success: boolean
  warning?: string
} {
  try {
    const secureStorage = getSecureStorage()
    const storageData: SecureStorageData = secureStorage.read() || {}
    if (storageData.telegramProfiles) {
      delete storageData.telegramProfiles[profileId]
      if (Object.keys(storageData.telegramProfiles).length === 0) {
        delete storageData.telegramProfiles
      }
    }
    const result = secureStorage.update(storageData)
    if (!result.success) {
      return result
    }

    saveGlobalConfig(current => {
      if (!current.telegramProfiles?.[profileId]) {
        return current
      }
      const nextProfiles = { ...current.telegramProfiles }
      delete nextProfiles[profileId]
      return {
        ...current,
        telegramProfiles:
          Object.keys(nextProfiles).length > 0 ? nextProfiles : undefined,
      }
    })

    return result
  } catch (error) {
    logError(error)
    return { success: false }
  }
}

export function saveCurrentProjectTelegramBinding(params: {
  profileId: string
  allowedChatIds: string[]
  pollTimeoutSeconds?: number
  defaultChatId?: string
  lastInboundChatId?: string
}): void {
  const now = Date.now()
  const allowedChatIds = normalizeChatIdList(params.allowedChatIds)

  saveCurrentProjectConfig(current => ({
    ...current,
    telegram: {
      profileId: params.profileId.trim(),
      allowedChatIds,
      pollTimeoutSeconds:
        params.pollTimeoutSeconds && params.pollTimeoutSeconds > 0
          ? params.pollTimeoutSeconds
          : DEFAULT_POLL_TIMEOUT_SECONDS,
      defaultChatId: params.defaultChatId,
      lastInboundChatId: params.lastInboundChatId,
      pairedAt: current.telegram?.pairedAt ?? now,
      updatedAt: now,
    },
  }))
}

export function clearCurrentProjectTelegramBinding(): void {
  saveCurrentProjectConfig(current => {
    if (!current.telegram) {
      return current
    }
    return {
      ...current,
      telegram: undefined,
    }
  })
}

export function saveTelegramStoredBotToken(
  botToken: string,
): { success: boolean; warning?: string } {
  return saveTelegramBotProfile({
    profileId: LEGACY_PROFILE_ID,
    botToken,
  })
}

export function clearTelegramStoredBotToken(): {
  success: boolean
  warning?: string
} {
  return removeTelegramBotProfile(LEGACY_PROFILE_ID)
}

export function saveTelegramAppConfig(params: {
  allowedChatIds: string[]
  pollTimeoutSeconds?: number
  lastPairedChatId?: string
  botUsername?: string
  botDisplayName?: string
}): void {
  saveGlobalConfig(current => ({
    ...current,
    telegramProfiles: {
      ...current.telegramProfiles,
      [LEGACY_PROFILE_ID]: {
        profileId: LEGACY_PROFILE_ID,
        botUsername: params.botUsername,
        botDisplayName: params.botDisplayName,
        createdAt:
          current.telegramProfiles?.[LEGACY_PROFILE_ID]?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      },
    },
    telegram: undefined,
  }))

  saveCurrentProjectTelegramBinding({
    profileId: LEGACY_PROFILE_ID,
    allowedChatIds: params.allowedChatIds,
    pollTimeoutSeconds: params.pollTimeoutSeconds,
    defaultChatId: params.lastPairedChatId,
    lastInboundChatId: params.lastPairedChatId,
  })
}

export function clearTelegramAppConfig(): void {
  clearCurrentProjectTelegramBinding()
  saveGlobalConfig(current => {
    if (!current.telegram) {
      return current
    }

    return {
      ...current,
      telegram: undefined,
    }
  })
}
