import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { logError } from '../../utils/log.js'
import { getSecureStorage } from '../../utils/secureStorage/index.js'
import type { SecureStorageData } from '../../utils/secureStorage/types.js'

export type TelegramConfig = {
  botToken: string
  allowedChatIds: Set<string>
  pollTimeoutSeconds: number
}

export type TelegramConfigSnapshot = {
  botTokenConfigured: boolean
  allowedChatIdsCount: number
  pollTimeoutSeconds: number
  ready: boolean
  source: 'none' | 'env' | 'app'
  envOverride: boolean
  botUsername?: string
  botDisplayName?: string
  lastPairedChatId?: string
}

export type TelegramAppConfig = {
  allowedChatIds: string[]
  pollTimeoutSeconds: number
  lastPairedChatId?: string
  botUsername?: string
  botDisplayName?: string
  pairedAt?: number
}

type ResolvedTelegramConfigState = {
  source: 'none' | 'env' | 'app'
  envOverride: boolean
  botToken: string | null
  allowedChatIds: Set<string>
  pollTimeoutSeconds: number
  botUsername?: string
  botDisplayName?: string
  lastPairedChatId?: string
}

const DEFAULT_POLL_TIMEOUT_SECONDS = 20

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

function hasAnyTelegramEnvOverride(): boolean {
  return (
    typeof process.env.CLAUDE_CODE_TELEGRAM_BOT_TOKEN === 'string' ||
    typeof process.env.CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS === 'string' ||
    typeof process.env.CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC === 'string'
  )
}

function getStoredTelegramBotToken(): string | null {
  try {
    const storageData = getSecureStorage().read()
    const token = storageData?.telegram
    return token && typeof token.botToken === 'string' && token.botToken.trim()
      ? token.botToken.trim()
      : null
  } catch (error) {
    logError(error)
    return null
  }
}

function normalizeTelegramAppConfig(): TelegramAppConfig | null {
  const rawConfig = getGlobalConfig().telegram
  if (!rawConfig || typeof rawConfig !== 'object') {
    return null
  }

  const allowedChatIds = Array.isArray(rawConfig.allowedChatIds)
    ? rawConfig.allowedChatIds
        .map(value => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
    : []

  return {
    allowedChatIds,
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
    }
  }

  const appConfig = normalizeTelegramAppConfig()
  const botToken = getStoredTelegramBotToken()
  const allowedChatIds = new Set(appConfig?.allowedChatIds ?? [])

  if (!botToken && allowedChatIds.size === 0) {
    return {
      source: 'none',
      envOverride: false,
      botToken: null,
      allowedChatIds,
      pollTimeoutSeconds: DEFAULT_POLL_TIMEOUT_SECONDS,
    }
  }

  return {
    source: 'app',
    envOverride: false,
    botToken,
    allowedChatIds,
    pollTimeoutSeconds:
      appConfig?.pollTimeoutSeconds ?? DEFAULT_POLL_TIMEOUT_SECONDS,
    botUsername: appConfig?.botUsername,
    botDisplayName: appConfig?.botDisplayName,
    lastPairedChatId: appConfig?.lastPairedChatId,
  }
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
    botUsername: resolved.botUsername,
    botDisplayName: resolved.botDisplayName,
    lastPairedChatId: resolved.lastPairedChatId,
  }
}

export function saveTelegramStoredBotToken(
  botToken: string,
): { success: boolean; warning?: string } {
  try {
    const secureStorage = getSecureStorage()
    const storageData: SecureStorageData = secureStorage.read() || {}
    storageData.telegram = {
      botToken: botToken.trim(),
      updatedAt: Date.now(),
    }
    return secureStorage.update(storageData)
  } catch (error) {
    logError(error)
    return { success: false }
  }
}

export function clearTelegramStoredBotToken(): {
  success: boolean
  warning?: string
} {
  try {
    const secureStorage = getSecureStorage()
    const storageData: SecureStorageData = secureStorage.read() || {}
    delete storageData.telegram
    return secureStorage.update(storageData)
  } catch (error) {
    logError(error)
    return { success: false }
  }
}

export function saveTelegramAppConfig(params: {
  allowedChatIds: string[]
  pollTimeoutSeconds?: number
  lastPairedChatId?: string
  botUsername?: string
  botDisplayName?: string
}): void {
  const allowedChatIds = Array.from(
    new Set(params.allowedChatIds.map(value => value.trim()).filter(Boolean)),
  )

  saveGlobalConfig(current => ({
    ...current,
    telegram: {
      allowedChatIds,
      pollTimeoutSeconds:
        params.pollTimeoutSeconds && params.pollTimeoutSeconds > 0
          ? params.pollTimeoutSeconds
          : DEFAULT_POLL_TIMEOUT_SECONDS,
      lastPairedChatId: params.lastPairedChatId,
      botUsername: params.botUsername,
      botDisplayName: params.botDisplayName,
      pairedAt: Date.now(),
    },
  }))
}

export function clearTelegramAppConfig(): void {
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
