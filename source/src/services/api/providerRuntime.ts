import { feature } from 'bun:bundle'
import {
  queryModelWithStreaming,
  queryModelWithoutStreaming,
} from './claude.js'
import {
  queryOpenAiCodexWithStreaming,
  queryOpenAiCodexWithoutStreaming,
  getDocumentedOpenAiCodexModelCapabilities,
  getRoutedOpenAiCodexModelCapabilities,
} from './openaiCodex.js'
import {
  formatGeminiCapabilityLabels,
  getDefaultGeminiComputerUseModel,
  getDocumentedGeminiModelCapabilities,
  getGeminiApiKeyAuthTarget,
  getRoutedGeminiModelCapabilities,
  queryGeminiWithStreaming,
  queryGeminiWithoutStreaming,
  validateGeminiComputerUseModel,
} from './gemini.js'
import {
  getDefaultGeminiApiKeyProfile,
  getDefaultOpenAiCodexApiKeyProfile,
  getDefaultOpenAiCodexOAuthProfile,
  getGeminiAuthReadiness,
  getOpenAiCodexAuthReadiness,
} from '../authProfiles/store.js'
import { maybeAdoptExternalCodexCliAuthProfile } from '../authProfiles/openaiCodexOAuth.js'
import { getResolvedOpenAiCodexAuth } from '../authProfiles/openaiCodexAuth.js'
import {
  isOpenAiHostedFileSearchConfigured,
  isOpenAiRemoteMcpConfigured,
} from './openaiCapabilityConfig.js'
import { isGeminiHostedFileSearchConfigured } from './geminiFileSearchConfig.js'
import {
  type APIProvider,
  getAPIProvider,
  shouldUseGeminiProvider,
  shouldUseOpenAiCodexProvider,
} from '../../utils/model/providers.js'
import { getMainLoopModel } from '../../utils/model/model.js'
import { isToolSearchEnabledOptimistic } from '../../utils/toolSearch.js'
import { getPlatform } from '../../utils/platform.js'
import { getChicagoEnabled } from '../../utils/computerUse/gates.js'

export type MainLoopProviderRuntimeId =
  | 'anthropic-first-party'
  | 'anthropic-bedrock'
  | 'anthropic-vertex'
  | 'anthropic-foundry'
  | 'openai-codex'
  | 'gemini'

export type MainLoopProviderWireApi =
  | 'anthropic-messages'
  | 'openai-codex-responses'
  | 'gemini-generate-content'

export type MainLoopProviderRuntime = {
  family: 'anthropic' | 'openai' | 'gemini'
  provider: MainLoopProviderRuntimeId
  displayName: string
  apiProvider: APIProvider | null
  wireApi: MainLoopProviderWireApi
  supportsProviderOwnedOAuth: boolean
  supportsOpenAiStyleModels: boolean
  documentedOpenAiModelCapabilities: string[]
  routedOpenAiModelCapabilities: string[]
  documentedGeminiModelCapabilities: string[]
  routedGeminiModelCapabilities: string[]
  supportsLocalToolSearch: boolean
  supportsLocalSkills: boolean
  supportsLocalComputerUse: boolean
  supportsLocalMcpTools: boolean
  supportsAgentTeams: boolean
  supportsOpenAiBuiltInTools: boolean
  supportsComputerUse: boolean
  supportsHostedFileSearch: boolean
  hostedFileSearchConfigured: boolean
  supportsRemoteMcp: boolean
  supportsWebSearch: boolean
  supportsHostedShell: boolean
  supportsCodeInterpreter: boolean
  supportsImageGeneration: boolean
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
  const supportsLocalComputerUse =
    feature('CHICAGO_MCP') &&
    getPlatform() === 'macos' &&
    getChicagoEnabled()
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
    documentedOpenAiModelCapabilities: [],
    routedOpenAiModelCapabilities: [],
    documentedGeminiModelCapabilities: [],
    routedGeminiModelCapabilities: [],
    supportsLocalToolSearch: isToolSearchEnabledOptimistic(),
    supportsLocalSkills: true,
    supportsLocalComputerUse,
    supportsLocalMcpTools: true,
    supportsAgentTeams: true,
    supportsOpenAiBuiltInTools: false,
    supportsComputerUse: false,
    supportsHostedFileSearch: false,
    hostedFileSearchConfigured: false,
    supportsRemoteMcp: false,
    supportsWebSearch:
      apiProvider === 'firstParty' ||
      apiProvider === 'vertex' ||
      apiProvider === 'foundry',
    supportsHostedShell: false,
    supportsCodeInterpreter: false,
    supportsImageGeneration: false,
    authState: 'ready',
    authSource: apiProvider === 'firstParty' ? 'anthropic-auth' : apiProvider,
    executionEnabled: true,
  }
}

function buildOpenAiCodexMainLoopRuntime(): MainLoopProviderRuntime {
  maybeAdoptExternalCodexCliAuthProfile()
  const readiness = getOpenAiCodexAuthReadiness()
  const routedModelCapabilities = getRoutedOpenAiCodexModelCapabilities(
    getMainLoopModel(),
  )
  const documentedModelCapabilities = getDocumentedOpenAiCodexModelCapabilities(
    getMainLoopModel(),
  )
  const hostedFileSearchConfigured = isOpenAiHostedFileSearchConfigured()
  const remoteMcpConfigured = isOpenAiRemoteMcpConfigured()
  const supportsLocalComputerUse =
    feature('CHICAGO_MCP') &&
    getPlatform() === 'macos' &&
    getChicagoEnabled()
  const supportsWebSearch =
    readiness.ready && routedModelCapabilities.supportsWebSearch
  const supportsHostedFileSearch =
    readiness.ready &&
    hostedFileSearchConfigured &&
    routedModelCapabilities.supportsFileSearch
  const supportsRemoteMcp =
    readiness.ready && remoteMcpConfigured && routedModelCapabilities.supportsMcp
  const supportsComputerUse =
    readiness.ready &&
    supportsLocalComputerUse &&
    routedModelCapabilities.supportsComputerUse
  const supportsHostedShell =
    readiness.ready && routedModelCapabilities.supportsHostedShell
  const supportsCodeInterpreter =
    readiness.ready && routedModelCapabilities.supportsCodeInterpreter
  const supportsImageGeneration =
    readiness.ready && routedModelCapabilities.supportsImageGeneration
  const supportsOpenAiBuiltInTools =
    supportsWebSearch ||
    supportsHostedFileSearch ||
    supportsRemoteMcp ||
    supportsComputerUse ||
    supportsHostedShell ||
    supportsCodeInterpreter ||
    supportsImageGeneration
  const defaultOAuthProfile = getDefaultOpenAiCodexOAuthProfile()
  const defaultApiKeyProfile = getDefaultOpenAiCodexApiKeyProfile()
  const hasApiKeyAuth = !!defaultApiKeyProfile || !!process.env.OPENAI_API_KEY?.trim()
  const authSource = defaultOAuthProfile
    ? 'provider-auth-profile'
    : defaultApiKeyProfile
      ? 'provider-api-key-profile'
    : process.env.OPENAI_API_KEY?.trim()
      ? 'OPENAI_API_KEY'
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
    documentedOpenAiModelCapabilities: [
      ...(documentedModelCapabilities.supportsWebSearch ? ['web search'] : []),
      ...(documentedModelCapabilities.supportsFileSearch ? ['file search'] : []),
      ...(documentedModelCapabilities.supportsMcp ? ['MCP'] : []),
      ...(documentedModelCapabilities.supportsToolSearch ? ['tool search'] : []),
      ...(documentedModelCapabilities.supportsHostedShell ? ['hosted shell'] : []),
      ...(documentedModelCapabilities.supportsApplyPatch ? ['apply patch'] : []),
      ...(documentedModelCapabilities.supportsComputerUse ? ['computer use'] : []),
      ...(documentedModelCapabilities.supportsSkills ? ['skills'] : []),
      ...(documentedModelCapabilities.supportsCodeInterpreter
        ? ['code interpreter']
        : []),
      ...(documentedModelCapabilities.supportsImageGeneration
        ? ['image generation']
        : []),
    ],
    routedOpenAiModelCapabilities: [
      ...(routedModelCapabilities.supportsWebSearch ? ['web search'] : []),
      ...(routedModelCapabilities.supportsFileSearch ? ['file search'] : []),
      ...(routedModelCapabilities.supportsMcp ? ['MCP'] : []),
      ...(routedModelCapabilities.supportsToolSearch ? ['tool search'] : []),
      ...(routedModelCapabilities.supportsHostedShell ? ['hosted shell'] : []),
      ...(routedModelCapabilities.supportsApplyPatch ? ['apply patch'] : []),
      ...(routedModelCapabilities.supportsComputerUse ? ['computer use'] : []),
      ...(routedModelCapabilities.supportsSkills ? ['skills'] : []),
      ...(routedModelCapabilities.supportsCodeInterpreter
        ? ['code interpreter']
        : []),
      ...(routedModelCapabilities.supportsImageGeneration
        ? ['image generation']
        : []),
    ],
    documentedGeminiModelCapabilities: [],
    routedGeminiModelCapabilities: [],
    supportsLocalToolSearch: isToolSearchEnabledOptimistic(),
    supportsLocalSkills: true,
    supportsLocalComputerUse,
    supportsLocalMcpTools: true,
    supportsAgentTeams: readiness.ready,
    supportsOpenAiBuiltInTools,
    supportsComputerUse,
    supportsHostedFileSearch,
    hostedFileSearchConfigured,
    supportsRemoteMcp,
    supportsWebSearch,
    supportsHostedShell,
    supportsCodeInterpreter,
    supportsImageGeneration,
    authState: readiness.hasAnyProfile || hasApiKeyAuth
      ? 'ready'
      : readiness.externalSources.includes('codex-cli')
        ? 'available-via-cli'
        : 'not-configured',
    authSource,
    executionEnabled: readiness.ready,
  }
}

function buildGeminiMainLoopRuntime(): MainLoopProviderRuntime {
  const readiness = getGeminiAuthReadiness()
  const auth = getGeminiApiKeyAuthTarget()
  const routedModelCapabilities = getRoutedGeminiModelCapabilities(
    getMainLoopModel(),
  )
  const documentedModelCapabilities = getDocumentedGeminiModelCapabilities(
    getMainLoopModel(),
  )
  const supportsLocalComputerUse =
    feature('CHICAGO_MCP') &&
    getPlatform() === 'macos' &&
    getChicagoEnabled()
  const hostedFileSearchConfigured = isGeminiHostedFileSearchConfigured()
  const supportsWebSearch = !!auth && routedModelCapabilities.supportsWebSearch
  const computerUseModel = getDefaultGeminiComputerUseModel()
  const computerUseModelReady =
    validateGeminiComputerUseModel(computerUseModel) === null
  const supportsHostedFileSearch =
    !!auth &&
    hostedFileSearchConfigured &&
    routedModelCapabilities.supportsFileSearch
  const supportsHostedShell =
    !!auth && routedModelCapabilities.supportsCodeExecution
  const supportsComputerUse =
    !!auth && supportsLocalComputerUse && computerUseModelReady
  const supportsImageGeneration =
    !!auth && routedModelCapabilities.supportsImageGeneration
  const supportsProviderBuiltInTools =
    supportsWebSearch ||
    supportsHostedFileSearch ||
    supportsHostedShell ||
    supportsComputerUse ||
    supportsImageGeneration
  const routedGeminiModelCapabilities = formatGeminiCapabilityLabels({
    ...routedModelCapabilities,
    supportsFileSearch: supportsHostedFileSearch,
    supportsComputerUse,
  })

  return {
    family: 'gemini',
    provider: 'gemini',
    displayName: 'Google Gemini',
    apiProvider: null,
    wireApi: 'gemini-generate-content',
    supportsProviderOwnedOAuth: false,
    supportsOpenAiStyleModels: true,
    documentedOpenAiModelCapabilities: [],
    routedOpenAiModelCapabilities: [],
    documentedGeminiModelCapabilities: formatGeminiCapabilityLabels(
      documentedModelCapabilities,
    ),
    routedGeminiModelCapabilities,
    supportsLocalToolSearch: isToolSearchEnabledOptimistic(),
    supportsLocalSkills: true,
    supportsLocalComputerUse,
    supportsLocalMcpTools: true,
    supportsAgentTeams: readiness.ready || !!process.env.GEMINI_API_KEY?.trim(),
    supportsOpenAiBuiltInTools: supportsProviderBuiltInTools,
    supportsComputerUse,
    supportsHostedFileSearch,
    hostedFileSearchConfigured,
    supportsRemoteMcp: false,
    supportsWebSearch,
    supportsHostedShell,
    supportsCodeInterpreter: false,
    supportsImageGeneration,
    authState:
      readiness.hasAnyProfile || !!process.env.GEMINI_API_KEY?.trim()
        ? 'ready'
        : 'not-configured',
    authSource: auth?.source ?? null,
    executionEnabled: !!auth,
  }
}

function shouldPreferOpenAiCodexMainLoop(): boolean {
  return shouldUseOpenAiCodexProvider()
}

function shouldPreferGeminiMainLoop(): boolean {
  return shouldUseGeminiProvider()
}

export type MainLoopProviderRuntimeSnapshot = {
  execution: MainLoopProviderRuntime
  preferred: MainLoopProviderRuntime
  available: MainLoopProviderRuntime[]
  openAiCodexAuthReady: boolean
  openAiCodexNativeAuthReady: boolean
  openAiCodexApiKeyReady: boolean
  openAiCodexCliFallbackReady: boolean
  openAiCodexAuthSource: string | null
  openAiCodexAccountLabel: string | null
  openAiCodexPlanLabel: string | null
  documentedOpenAiModelCapabilities: string[]
  routedOpenAiModelCapabilities: string[]
  geminiAuthReady: boolean
  geminiApiKeyReady: boolean
  geminiAuthSource: string | null
  documentedGeminiModelCapabilities: string[]
  routedGeminiModelCapabilities: string[]
  supportsLocalToolSearch: boolean
  supportsLocalSkills: boolean
  supportsLocalComputerUse: boolean
  supportsLocalMcpTools: boolean
  supportsAgentTeams: boolean
  supportsOpenAiBuiltInTools: boolean
  supportsComputerUse: boolean
  supportsHostedFileSearch: boolean
  hostedFileSearchConfigured: boolean
  supportsRemoteMcp: boolean
  supportsWebSearch: boolean
  supportsHostedShell: boolean
  supportsCodeInterpreter: boolean
  supportsImageGeneration: boolean
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
  const gemini = buildGeminiMainLoopRuntime()
  const openAiProfile = getDefaultOpenAiCodexOAuthProfile()
  const openAiApiKeyProfile = getDefaultOpenAiCodexApiKeyProfile()
  const geminiApiKeyProfile = getDefaultGeminiApiKeyProfile()
  const preferred = shouldPreferGeminiMainLoop()
    ? gemini
    : shouldPreferOpenAiCodexMainLoop()
      ? openAiCodex
      : anthropic
  const execution = preferred
  const available = [anthropic]

  if (openAiCodex.authState !== 'not-configured') {
    available.push(openAiCodex)
  }
  if (gemini.authState !== 'not-configured') {
    available.push(gemini)
  }

  return {
    execution,
    preferred,
    available,
    openAiCodexAuthReady: openAiCodex.authState !== 'not-configured',
    openAiCodexNativeAuthReady: !!openAiProfile,
    openAiCodexApiKeyReady:
      !!openAiApiKeyProfile || !!process.env.OPENAI_API_KEY?.trim(),
    openAiCodexCliFallbackReady: openAiReadiness.readyViaExternal,
    openAiCodexAuthSource: openAiCodex.authSource,
    openAiCodexAccountLabel:
      openAiProfile?.emailAddress ??
      (typeof openAiProfile?.metadata?.accountId === 'string'
        ? openAiProfile.metadata.accountId
        : openAiProfile?.accountUuid ??
          openAiApiKeyProfile?.label ??
          null),
    openAiCodexPlanLabel: formatOpenAiCodexPlanLabel(
      openAiProfile?.metadata?.planType,
    ),
    documentedOpenAiModelCapabilities:
      execution.documentedOpenAiModelCapabilities,
    routedOpenAiModelCapabilities: execution.routedOpenAiModelCapabilities,
    geminiAuthReady: gemini.authState !== 'not-configured',
    geminiApiKeyReady:
      !!geminiApiKeyProfile || !!process.env.GEMINI_API_KEY?.trim(),
    geminiAuthSource: gemini.authSource,
    documentedGeminiModelCapabilities:
      execution.documentedGeminiModelCapabilities,
    routedGeminiModelCapabilities: execution.routedGeminiModelCapabilities,
    supportsLocalToolSearch: execution.supportsLocalToolSearch,
    supportsLocalSkills: execution.supportsLocalSkills,
    supportsLocalComputerUse: execution.supportsLocalComputerUse,
    supportsLocalMcpTools: execution.supportsLocalMcpTools,
    supportsAgentTeams: execution.supportsAgentTeams,
    supportsOpenAiBuiltInTools: execution.supportsOpenAiBuiltInTools,
    supportsComputerUse: execution.supportsComputerUse,
    supportsHostedFileSearch: execution.supportsHostedFileSearch,
    hostedFileSearchConfigured: execution.hostedFileSearchConfigured,
    supportsRemoteMcp: execution.supportsRemoteMcp,
    supportsWebSearch: execution.supportsWebSearch,
    supportsHostedShell: execution.supportsHostedShell,
    supportsCodeInterpreter: execution.supportsCodeInterpreter,
    supportsImageGeneration: execution.supportsImageGeneration,
  }
}

export function getMainLoopProviderRuntime(
  apiProvider: APIProvider = getAPIProvider(),
): MainLoopProviderRuntime {
  const anthropic = buildAnthropicMainLoopRuntime(apiProvider)
  if (shouldPreferGeminiMainLoop()) {
    return buildGeminiMainLoopRuntime()
  }

  if (!shouldPreferOpenAiCodexMainLoop()) {
    return anthropic
  }

  const openAiCodex = buildOpenAiCodexMainLoopRuntime()
  return openAiCodex
}

export async function getResolvedMainLoopOpenAiCodexAuthSource(): Promise<string | null> {
  const auth = await getResolvedOpenAiCodexAuth()
  return auth?.source ?? null
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
    case 'gemini-generate-content':
      return queryGeminiWithStreaming(...args)
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
    case 'gemini-generate-content':
      return queryGeminiWithoutStreaming(...args)
  }
}
