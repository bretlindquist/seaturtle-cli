import * as React from 'react'
import { clearTrustedDeviceToken, clearTrustedDeviceTokenCache } from '../../bridge/trustedDevice.js'
import { ConfigurableShortcutHint } from '../../components/ConfigurableShortcutHint.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import { resetOpenAiCodexSessionTelemetry } from '../../services/api/openaiCodexTelemetry.js'
import { getMainLoopProviderRuntimeSnapshot } from '../../services/api/providerRuntime.js'
import {
  clearProviderAuthProfiles,
  getOpenAiCodexAuthReadiness,
  OPENAI_CODEX_PROVIDER,
} from '../../services/authProfiles/store.js'
import { getAnthropicApiKeyWithSource, getAuthTokenSource, getClaudeAIOAuthTokens, removeApiKey } from '../../utils/auth.js'
import { clearBetasCaches } from '../../utils/betas.js'
import { saveGlobalConfig } from '../../utils/config.js'
import { gracefulShutdownSync } from '../../utils/gracefulShutdown.js'
import { getSecureStorage } from '../../utils/secureStorage/index.js'
import type { SecureStorageData } from '../../utils/secureStorage/types.js'
import { clearToolSchemaCache } from '../../utils/toolSchemaCache.js'
import { resetUserCache } from '../../utils/user.js'
import { refreshGrowthBookAfterAuthChange } from '../../services/analytics/growthbook.js'
import { getGroveNoticeConfig, getGroveSettings } from '../../services/api/grove.js'
import { clearPolicyLimitsCache } from '../../services/policyLimits/index.js'
import { clearRemoteManagedSettingsCache } from '../../services/remoteManagedSettings/index.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'

type LogoutTarget = 'anthropic' | 'openai-codex' | 'all'

function hasAnthropicAuthConfigured(): boolean {
  const { hasToken } = getAuthTokenSource()
  const { source: apiKeySource } = getAnthropicApiKeyWithSource({
    skipRetrievingKeyFromApiKeyHelper: true,
  })
  return hasToken || apiKeySource !== 'none'
}

function shouldPreferOpenAiCodexAfterAnthropicLogout(): boolean {
  return getOpenAiCodexAuthReadiness().ready
}

function updateConfigAfterLogout({
  clearOnboarding,
  clearAnthropicAccount,
  nextPreferredMainProvider,
}: {
  clearOnboarding: boolean
  clearAnthropicAccount: boolean
  nextPreferredMainProvider: 'anthropic' | 'openai-codex'
}): void {
  saveGlobalConfig(current => {
    const updated = {
      ...current,
      preferredMainProvider: nextPreferredMainProvider,
    }

    if (clearAnthropicAccount) {
      updated.oauthAccount = undefined
      updated.hasAvailableSubscription = false
      updated.subscriptionNoticeCount = 0
    }

    const hasAnyLinkedAuth =
      hasAnthropicAuthConfigured() || nextPreferredMainProvider === 'openai-codex'

    if (clearOnboarding && !hasAnyLinkedAuth) {
      updated.hasCompletedOnboarding = false
      if (updated.customApiKeyResponses?.approved) {
        updated.customApiKeyResponses = {
          ...updated.customApiKeyResponses,
          approved: [],
        }
      }
    }

    return updated
  })
}

async function flushTelemetryBeforeLogout(): Promise<void> {
  const { flushTelemetry } = await import(
    '../../utils/telemetry/instrumentation.js'
  )
  await flushTelemetry()
}

function clearAnthropicSecureStorageData(): void {
  const secureStorage = getSecureStorage()
  try {
    const storageData: SecureStorageData = secureStorage.read() || {}
    delete storageData.claudeAiOauth
    secureStorage.update(storageData)
  } catch {
    // Best-effort
  }

  clearTrustedDeviceToken()
  clearProviderAuthProfiles({ provider: 'anthropic' })
}

function clearOpenAiCodexLinkage(): void {
  clearProviderAuthProfiles({ provider: OPENAI_CODEX_PROVIDER })
}

export async function performAnthropicLogout({
  clearOnboarding = false,
}: {
  clearOnboarding?: boolean
} = {}): Promise<void> {
  await flushTelemetryBeforeLogout()
  await removeApiKey()
  clearAnthropicSecureStorageData()
  await clearAuthRelatedCaches()
  updateConfigAfterLogout({
    clearOnboarding,
    clearAnthropicAccount: true,
    nextPreferredMainProvider: shouldPreferOpenAiCodexAfterAnthropicLogout()
      ? 'openai-codex'
      : 'anthropic',
  })
}

export async function performOpenAiCodexLogout({
  clearOnboarding = false,
}: {
  clearOnboarding?: boolean
} = {}): Promise<void> {
  await flushTelemetryBeforeLogout()
  clearOpenAiCodexLinkage()
  await clearAuthRelatedCaches()
  updateConfigAfterLogout({
    clearOnboarding,
    clearAnthropicAccount: false,
    nextPreferredMainProvider: 'anthropic',
  })
}

export async function performLogout({
  clearOnboarding = false,
}: {
  clearOnboarding?: boolean
} = {}): Promise<void> {
  await performAnthropicLogout({ clearOnboarding })
}

export async function clearAuthRelatedCaches(): Promise<void> {
  resetOpenAiCodexSessionTelemetry()
  getClaudeAIOAuthTokens.cache?.clear?.()
  clearTrustedDeviceTokenCache()
  clearBetasCaches()
  clearToolSchemaCache()
  resetUserCache()
  refreshGrowthBookAfterAuthChange()
  getGroveNoticeConfig.cache?.clear?.()
  getGroveSettings.cache?.clear?.()
  await clearRemoteManagedSettingsCache()
  await clearPolicyLimitsCache()
}

type LogoutOption = {
  value: LogoutTarget
  label: React.ReactNode
}

function buildLogoutOptions(): LogoutOption[] {
  const anthropicConfigured = hasAnthropicAuthConfigured()
  const openAiReadiness = getOpenAiCodexAuthReadiness()

  const options: LogoutOption[] = []

  if (anthropicConfigured) {
    options.push({
      value: 'anthropic',
      label: (
        <Text>
          Anthropic account{'\n'}
          <Text dimColor>
            Sign CT out of Anthropic login and managed API access
          </Text>
        </Text>
      ),
    })
  }

  if (openAiReadiness.ready) {
    options.push({
      value: 'openai-codex',
      label: (
        <Text>
          OpenAI Codex OAuth{'\n'}
          <Text dimColor>
            Remove CT&apos;s local Codex linkage and switch away from the
            OpenAI provider
          </Text>
        </Text>
      ),
    })
  }

  if (anthropicConfigured && openAiReadiness.ready) {
    options.push({
      value: 'all',
      label: (
        <Text>
          All configured providers{'\n'}
          <Text dimColor>
            Clear Anthropic auth and CT&apos;s OpenAI Codex linkage
          </Text>
        </Text>
      ),
    })
  }

  return options
}

function getDefaultLogoutTarget(options: LogoutOption[]): LogoutTarget {
  const runtimeSnapshot = getMainLoopProviderRuntimeSnapshot()

  if (
    runtimeSnapshot.preferred.family === 'openai' &&
    options.some(option => option.value === 'openai-codex')
  ) {
    return 'openai-codex'
  }

  if (options.some(option => option.value === 'anthropic')) {
    return 'anthropic'
  }

  return options[0]?.value ?? 'anthropic'
}

async function executeLogout(target: LogoutTarget): Promise<string> {
  if (target === 'anthropic') {
    await performAnthropicLogout({ clearOnboarding: true })
    return 'Successfully logged out from your Anthropic account.'
  }

  if (target === 'openai-codex') {
    await performOpenAiCodexLogout({ clearOnboarding: true })
    return "Removed CT's native OpenAI/Codex OAuth profile. Existing Codex CLI auth was left intact."
  }

  await performAnthropicLogout({ clearOnboarding: false })
  await performOpenAiCodexLogout({ clearOnboarding: true })
  return 'Cleared Anthropic auth and CT’s OpenAI Codex linkage.'
}

function LogoutCommand({
  onDone,
}: {
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const options = React.useMemo(() => buildLogoutOptions(), [])
  const defaultTarget = React.useMemo(
    () => getDefaultLogoutTarget(options),
    [options],
  )

  React.useEffect(() => {
    if (options.length > 0) {
      return
    }

    onDone('No CT auth is currently configured.', {
      display: 'system',
    })
  }, [onDone, options])

  if (options.length === 0) {
    return null
  }

  return (
    <Dialog
      title="Logout"
      onCancel={() =>
        onDone('Logout canceled', {
          display: 'system',
        })
      }
      color="permission"
      inputGuide={exitState =>
        exitState.pending ? (
          <Text>Press {exitState.keyName} again to exit</Text>
        ) : (
          <ConfigurableShortcutHint
            action="confirm:no"
            context="Confirmation"
            fallback="Esc"
            description="cancel"
          />
        )
      }
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          Choose which auth to remove from CT.
        </Text>
        {error ? <Text color="error">{error}</Text> : null}
        {isSubmitting ? (
          <Text>Logging out…</Text>
        ) : (
          <Select
            defaultValue={defaultTarget}
            defaultFocusValue={defaultTarget}
            options={options}
            onChange={value => {
              setIsSubmitting(true)
              void executeLogout(value)
                .then(message => {
                  onDone(message)
                  setTimeout(() => {
                    gracefulShutdownSync(0, 'logout')
                  }, 200)
                })
                .catch(() => {
                  setError('Failed to log out.')
                  setIsSubmitting(false)
                })
            }}
            onCancel={() =>
              onDone('Logout canceled', {
                display: 'system',
              })
            }
          />
        )}
        <Text dimColor>
          OpenAI logout removes CT&apos;s native local linkage. If you also
          want to sign out of Codex itself, run <Text bold>codex logout</Text>.
        </Text>
      </Box>
    </Dialog>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
): Promise<React.ReactNode> {
  return <LogoutCommand onDone={onDone} />
}
