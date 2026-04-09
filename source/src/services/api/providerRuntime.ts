import {
  queryModelWithStreaming,
  queryModelWithoutStreaming,
} from './claude.js'
import {
  queryOpenAiCodexWithStreaming,
  queryOpenAiCodexWithoutStreaming,
} from './openaiCodex.js'
import {
  getDefaultOpenAiCodexOAuthProfile,
  getOpenAiCodexAuthReadiness,
} from '../authProfiles/store.js'
import { maybeAdoptExternalCodexCliAuthProfile } from '../authProfiles/openaiCodexOAuth.js'
import {
  type APIProvider,
  getAPIProvider,
  shouldUseOpenAiCodexProvider,
} from '../../utils/model/providers.js'

export type MainLoopProviderRuntimeId =
  | 'anthropic-first-party'
  | 'anthropic-bedrock'
  | 'anthropic-vertex'
  | 'anthropic-foundry'
  | 'openai-codex'

export type MainLoopProviderWireApi =
  | 'anthropic-messages'
  | 'openai-codex-responses'

export type MainLoopProviderRuntime = {
  family: 'anthropic' | 'openai'
  provider: MainLoopProviderRuntimeId
  displayName: string
  apiProvider: APIProvider | null
  wireApi: MainLoopProviderWireApi
  supportsProviderOwnedOAuth: boolean
  supportsOpenAiStyleModels: boolean
  authState: 'ready' | 'available-via-cli' | 'not-configured'
  authSource: string | null
  executionEnabled: boolean
}

function mapApiProviderToMainLoopRuntimeId(
  apiProvider: APIProvider,
): MainLoopProviderRuntimeId {
  switch (apiProvider) {
    case 'bedrock':
      return 'anthropic-bedrock'
    case 'vertex':
      return 'anthropic-vertex'
    case 'foundry':
      return 'anthropic-foundry'
    case 'firstParty':
      return 'anthropic-first-party'
  }
}

function buildAnthropicMainLoopRuntime(
  apiProvider: APIProvider,
): MainLoopProviderRuntime {
  return {
    family: 'anthropic',
    provider: mapApiProviderToMainLoopRuntimeId(apiProvider),
    displayName:
      apiProvider === 'firstParty'
        ? 'Anthropic first-party'
        : apiProvider === 'bedrock'
          ? 'Anthropic via AWS Bedrock'
          : apiProvider === 'vertex'
            ? 'Anthropic via Google Vertex AI'
            : 'Anthropic via Microsoft Foundry',
    apiProvider,
    wireApi: 'anthropic-messages',
    supportsProviderOwnedOAuth: apiProvider === 'firstParty',
    supportsOpenAiStyleModels: false,
    authState: 'ready',
    authSource: apiProvider === 'firstParty' ? 'anthropic-auth' : apiProvider,
    executionEnabled: true,
  }
}

function buildOpenAiCodexMainLoopRuntime(): MainLoopProviderRuntime {
  maybeAdoptExternalCodexCliAuthProfile()
  const readiness = getOpenAiCodexAuthReadiness()
  const authSource = readiness.hasDefaultProfile
    ? 'provider-auth-profile'
    : readiness.hasAnyProfile
      ? 'provider-auth-profile'
      : readiness.externalSources.includes('codex-cli')
        ? 'codex-cli'
        : null

  return {
    family: 'openai',
    provider: 'openai-codex',
    displayName: 'OpenAI Codex OAuth',
    apiProvider: null,
    wireApi: 'openai-codex-responses',
    supportsProviderOwnedOAuth: true,
    supportsOpenAiStyleModels: true,
    authState: readiness.hasAnyProfile
      ? 'ready'
      : readiness.externalSources.includes('codex-cli')
        ? 'available-via-cli'
        : 'not-configured',
    authSource,
    executionEnabled: readiness.ready,
  }
}

function shouldPreferOpenAiCodexMainLoop(): boolean {
  return shouldUseOpenAiCodexProvider()
}

export type MainLoopProviderRuntimeSnapshot = {
  execution: MainLoopProviderRuntime
  preferred: MainLoopProviderRuntime
  available: MainLoopProviderRuntime[]
  openAiCodexAuthReady: boolean
  openAiCodexNativeAuthReady: boolean
  openAiCodexCliFallbackReady: boolean
  openAiCodexAuthSource: string | null
  openAiCodexAccountLabel: string | null
  openAiCodexPlanLabel: string | null
}

function formatOpenAiCodexPlanLabel(rawPlanType: unknown): string | null {
  if (typeof rawPlanType !== 'string') {
    return null
  }

  const normalized = rawPlanType.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  switch (normalized) {
    case 'plus':
      return 'Plus'
    case 'pro':
      return 'Pro'
    case 'team':
      return 'Team'
    case 'enterprise':
      return 'Enterprise'
    case 'free':
      return 'Free'
    default:
      return normalized
        .split(/[\s_-]+/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
  }
}

export function getMainLoopProviderRuntimeSnapshot(): MainLoopProviderRuntimeSnapshot {
  const anthropic = buildAnthropicMainLoopRuntime(getAPIProvider())
  const openAiReadiness = getOpenAiCodexAuthReadiness()
  const openAiCodex = buildOpenAiCodexMainLoopRuntime()
  const openAiProfile = getDefaultOpenAiCodexOAuthProfile()
  const preferred = shouldPreferOpenAiCodexMainLoop() ? openAiCodex : anthropic
  const execution = preferred.executionEnabled ? preferred : anthropic
  const available = [anthropic]

  if (openAiCodex.authState !== 'not-configured') {
    available.push(openAiCodex)
  }

  return {
    execution,
    preferred,
    available,
    openAiCodexAuthReady: openAiCodex.authState !== 'not-configured',
    openAiCodexNativeAuthReady: openAiReadiness.readyViaProfile,
    openAiCodexCliFallbackReady: openAiReadiness.readyViaExternal,
    openAiCodexAuthSource: openAiCodex.authSource,
    openAiCodexAccountLabel:
      openAiProfile?.emailAddress ??
      (typeof openAiProfile?.metadata?.accountId === 'string'
        ? openAiProfile.metadata.accountId
        : openAiProfile?.accountUuid ?? null),
    openAiCodexPlanLabel: formatOpenAiCodexPlanLabel(
      openAiProfile?.metadata?.planType,
    ),
  }
}

export function getMainLoopProviderRuntime(
  apiProvider: APIProvider = getAPIProvider(),
): MainLoopProviderRuntime {
  const anthropic = buildAnthropicMainLoopRuntime(apiProvider)
  if (!shouldPreferOpenAiCodexMainLoop()) {
    return anthropic
  }

  const openAiCodex = buildOpenAiCodexMainLoopRuntime()
  return openAiCodex.executionEnabled ? openAiCodex : anthropic
}

export function queryModelWithStreamingViaProviderRuntime(
  ...args: Parameters<typeof queryModelWithStreaming>
): ReturnType<typeof queryModelWithStreaming> {
  const runtime = getMainLoopProviderRuntime()

  switch (runtime.wireApi) {
    case 'anthropic-messages':
      return queryModelWithStreaming(...args)
    case 'openai-codex-responses':
      return queryOpenAiCodexWithStreaming(...args)
  }
}

export function queryModelWithoutStreamingViaProviderRuntime(
  ...args: Parameters<typeof queryModelWithoutStreaming>
): ReturnType<typeof queryModelWithoutStreaming> {
  const runtime = getMainLoopProviderRuntime()

  switch (runtime.wireApi) {
    case 'anthropic-messages':
      return queryModelWithoutStreaming(...args)
    case 'openai-codex-responses':
      return queryOpenAiCodexWithoutStreaming(...args)
  }
}
