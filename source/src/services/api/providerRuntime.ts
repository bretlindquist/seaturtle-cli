import {
  queryModelWithStreaming,
  queryModelWithoutStreaming,
} from './claude.js'
import {
  queryOpenAiCodexWithStreaming,
  queryOpenAiCodexWithoutStreaming,
} from './openaiCodex.js'
import { getOpenAiCodexAuthReadiness } from '../authProfiles/store.js'
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
  openAiCodexAuthSource: string | null
}

export function getMainLoopProviderRuntimeSnapshot(): MainLoopProviderRuntimeSnapshot {
  const anthropic = buildAnthropicMainLoopRuntime(getAPIProvider())
  const openAiCodex = buildOpenAiCodexMainLoopRuntime()
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
    openAiCodexAuthSource: openAiCodex.authSource,
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
