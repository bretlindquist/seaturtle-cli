import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { getGlobalConfig } from '../config.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry'
export type MainRuntimeProvider = 'anthropic' | 'openai-codex' | 'gemini'

function normalizeMainProvider(value: string | undefined): MainRuntimeProvider | null {
  const normalized = value?.trim()
  switch (normalized) {
    case 'anthropic':
    case 'openai-codex':
    case 'gemini':
      return normalized
    default:
      return null
  }
}

function getSeaTurtleMainProviderEnv(): MainRuntimeProvider | null {
  return normalizeMainProvider(process.env.SEATURTLE_MAIN_PROVIDER)
}

function getLegacyMainProviderEnv(): MainRuntimeProvider | null {
  return normalizeMainProvider(process.env.CLAUDE_CODE_MAIN_PROVIDER)
}

function getConfiguredMainProvider(): MainRuntimeProvider | null {
  try {
    return getGlobalConfig().preferredMainProvider ?? null
  } catch {
    return null
  }
}

export function getPreferredMainRuntimeProvider(): MainRuntimeProvider | null {
  return (
    getSeaTurtleMainProviderEnv() ??
    getConfiguredMainProvider() ??
    getLegacyMainProviderEnv()
  )
}

export function shouldUseOpenAiCodexProvider(): boolean {
  return (
    isEnvTruthy(process.env.SEATURTLE_USE_OPENAI_CODEX) ||
    getSeaTurtleMainProviderEnv() === 'openai-codex' ||
    getConfiguredMainProvider() === 'openai-codex' ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI_CODEX) ||
    getLegacyMainProviderEnv() === 'openai-codex'
  )
}

export function shouldUseGeminiProvider(): boolean {
  return (
    isEnvTruthy(process.env.SEATURTLE_USE_GEMINI) ||
    getSeaTurtleMainProviderEnv() === 'gemini' ||
    getConfiguredMainProvider() === 'gemini' ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI) ||
    getLegacyMainProviderEnv() === 'gemini'
  )
}

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
