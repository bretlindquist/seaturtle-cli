export type GeminiModelLifecycle = 'stable' | 'preview' | 'deprecated' | 'shut_down'

export type GeminiThinkingMode =
  | 'thinkingLevel'
  | 'thinkingBudget'
  | 'not-supported'

export type GeminiModelUse =
  | 'main-loop'
  | 'image'
  | 'computer-use'
  | 'embedding'
  | 'live'
  | 'tts'

export type GeminiModelDefinition = {
  value: string
  label: string
  description: string
  descriptionForModel: string
  lifecycle: GeminiModelLifecycle
  uses: readonly GeminiModelUse[]
  selectableInModelPicker: boolean
  contextWindowTokens?: number
  outputTokenLimit?: number
  thinkingMode: GeminiThinkingMode
  thinkingCanBeDisabled: boolean
}

export type GeminiModelCapabilities = {
  supportsFunctionCalling: boolean
  supportsMultimodalInput: boolean
  supportsDocuments: boolean
  supportsWebSearch: boolean
  supportsUrlContext: boolean
  supportsFileSearch: boolean
  supportsRemoteMcp: boolean
  supportsHostedShell: boolean
  supportsCodeExecution: boolean
  supportsComputerUse: boolean
  supportsImageGeneration: boolean
  supportsImageEditing: boolean
  supportsStructuredOutputs: boolean
  supportsTokenCounting: boolean
  supportsCachedContent: boolean
}

export const DEFAULT_GEMINI_MAIN_LOOP_MODEL = 'gemini-3-flash-preview'
export const DEFAULT_GEMINI_COMPUTER_USE_MODEL =
  'gemini-2.5-computer-use-preview-10-2025'

const EMPTY_GEMINI_MODEL_CAPABILITIES: GeminiModelCapabilities = {
  supportsFunctionCalling: false,
  supportsMultimodalInput: false,
  supportsDocuments: false,
  supportsWebSearch: false,
  supportsUrlContext: false,
  supportsFileSearch: false,
  supportsRemoteMcp: false,
  supportsHostedShell: false,
  supportsCodeExecution: false,
  supportsComputerUse: false,
  supportsImageGeneration: false,
  supportsImageEditing: false,
  supportsStructuredOutputs: false,
  supportsTokenCounting: false,
  supportsCachedContent: false,
}

// Documented capabilities describe what Google exposes for a model family.
// Routed capabilities below describe only what SeaTurtle has actually wired.
const MAIN_LOOP_DOCUMENTED_CAPABILITIES: GeminiModelCapabilities = {
  ...EMPTY_GEMINI_MODEL_CAPABILITIES,
  supportsFunctionCalling: true,
  supportsMultimodalInput: true,
  supportsDocuments: true,
  supportsWebSearch: true,
  supportsUrlContext: true,
  supportsFileSearch: true,
  supportsHostedShell: true,
  supportsCodeExecution: true,
  supportsStructuredOutputs: true,
  supportsTokenCounting: true,
  supportsCachedContent: true,
}

const ROUTED_GEMINI_MODEL_CAPABILITIES: GeminiModelCapabilities = {
  ...EMPTY_GEMINI_MODEL_CAPABILITIES,
  // Routed capabilities reflect native SeaTurtle runners that are actually wired.
  supportsFunctionCalling: true,
  supportsMultimodalInput: true,
  supportsWebSearch: true,
  supportsUrlContext: true,
  supportsCodeExecution: true,
}

const GEMINI_3_MAIN_LOOP_DOCUMENTED_CAPABILITIES: GeminiModelCapabilities = {
  ...MAIN_LOOP_DOCUMENTED_CAPABILITIES,
  supportsComputerUse: true,
}

const IMAGE_MODEL_DOCUMENTED_CAPABILITIES: GeminiModelCapabilities = {
  ...EMPTY_GEMINI_MODEL_CAPABILITIES,
  supportsMultimodalInput: true,
  supportsWebSearch: true,
  supportsImageGeneration: true,
  supportsImageEditing: true,
  supportsTokenCounting: true,
}

const GEMINI_MODEL_DEFINITIONS: readonly GeminiModelDefinition[] = [
  {
    value: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro Preview',
    description: 'Advanced Gemini 3.1 model for complex reasoning and agentic coding',
    descriptionForModel:
      'Gemini 3.1 Pro Preview - advanced model for complex reasoning and agentic coding',
    lifecycle: 'preview',
    uses: ['main-loop'],
    selectableInModelPicker: true,
    thinkingMode: 'thinkingLevel',
    thinkingCanBeDisabled: false,
  },
  {
    value: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    description: 'Frontier-class Gemini model for fast agentic work',
    descriptionForModel:
      'Gemini 3 Flash Preview - frontier-class Gemini model for fast agentic work',
    lifecycle: 'preview',
    uses: ['main-loop', 'computer-use'],
    selectableInModelPicker: true,
    thinkingMode: 'thinkingLevel',
    thinkingCanBeDisabled: false,
  },
  {
    value: 'gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash-Lite Preview',
    description: 'Fast Gemini 3.1 model for low-latency agentic work',
    descriptionForModel:
      'Gemini 3.1 Flash-Lite Preview - fast Gemini 3.1 model for low-latency agentic work',
    lifecycle: 'preview',
    uses: ['main-loop'],
    selectableInModelPicker: true,
    thinkingMode: 'thinkingLevel',
    thinkingCanBeDisabled: false,
  },
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Advanced Gemini 2.5 model for complex reasoning and coding',
    descriptionForModel:
      'Gemini 2.5 Pro - advanced Gemini 2.5 model for complex reasoning and coding',
    lifecycle: 'stable',
    uses: ['main-loop'],
    selectableInModelPicker: true,
    thinkingMode: 'thinkingBudget',
    thinkingCanBeDisabled: false,
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Best price-performance Gemini model for low-latency work',
    descriptionForModel:
      'Gemini 2.5 Flash - best price-performance Gemini model for low-latency work',
    lifecycle: 'stable',
    uses: ['main-loop'],
    selectableInModelPicker: true,
    thinkingMode: 'thinkingBudget',
    thinkingCanBeDisabled: true,
  },
  {
    value: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Fastest and most budget-friendly Gemini 2.5 model',
    descriptionForModel:
      'Gemini 2.5 Flash-Lite - fastest and most budget-friendly Gemini 2.5 model',
    lifecycle: 'stable',
    uses: ['main-loop'],
    selectableInModelPicker: true,
    thinkingMode: 'thinkingBudget',
    thinkingCanBeDisabled: true,
  },
  {
    value: 'gemini-3.1-flash-image-preview',
    label: 'Gemini 3.1 Flash Image Preview',
    description: 'Gemini 3 image generation and editing model optimized for speed',
    descriptionForModel:
      'Gemini 3.1 Flash Image Preview - image generation and editing optimized for speed',
    lifecycle: 'preview',
    uses: ['image'],
    selectableInModelPicker: false,
    thinkingMode: 'thinkingLevel',
    thinkingCanBeDisabled: false,
  },
  {
    value: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image Preview',
    description: 'Gemini 3 image generation and editing model for professional assets',
    descriptionForModel:
      'Gemini 3 Pro Image Preview - professional image generation and editing',
    lifecycle: 'preview',
    uses: ['image'],
    selectableInModelPicker: false,
    thinkingMode: 'thinkingLevel',
    thinkingCanBeDisabled: false,
  },
  {
    value: 'gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image',
    description: 'Gemini 2.5 image generation and editing model',
    descriptionForModel:
      'Gemini 2.5 Flash Image - image generation and editing',
    lifecycle: 'stable',
    uses: ['image'],
    selectableInModelPicker: false,
    thinkingMode: 'thinkingBudget',
    thinkingCanBeDisabled: true,
  },
  {
    value: DEFAULT_GEMINI_COMPUTER_USE_MODEL,
    label: 'Gemini 2.5 Computer Use Preview',
    description: 'Specialized Gemini computer-use model for browser UI actions',
    descriptionForModel:
      'Gemini 2.5 Computer Use Preview - specialized model for browser UI actions',
    lifecycle: 'preview',
    uses: ['computer-use'],
    selectableInModelPicker: false,
    contextWindowTokens: 128_000,
    outputTokenLimit: 64_000,
    thinkingMode: 'not-supported',
    thinkingCanBeDisabled: false,
  },
  {
    value: 'gemini-embedding-001',
    label: 'Gemini Embedding',
    description: 'Gemini embedding model used by file search and retrieval flows',
    descriptionForModel:
      'Gemini Embedding - embedding model used by file search and retrieval flows',
    lifecycle: 'stable',
    uses: ['embedding'],
    selectableInModelPicker: false,
    thinkingMode: 'not-supported',
    thinkingCanBeDisabled: false,
  },
] as const

const GEMINI_MODEL_DEFINITION_BY_ID = new Map(
  GEMINI_MODEL_DEFINITIONS.map(model => [model.value, model]),
)

export function getGeminiModelDefinitions(): readonly GeminiModelDefinition[] {
  return GEMINI_MODEL_DEFINITIONS
}

export function getGeminiMainLoopModelDefinitions(): readonly GeminiModelDefinition[] {
  return GEMINI_MODEL_DEFINITIONS.filter(model => model.selectableInModelPicker)
}

export function getGeminiModelDefinition(
  model: string,
): GeminiModelDefinition | null {
  return GEMINI_MODEL_DEFINITION_BY_ID.get(model) ?? null
}

export function isKnownGeminiModel(model: string): boolean {
  return GEMINI_MODEL_DEFINITION_BY_ID.has(model)
}

export function getDocumentedGeminiModelCapabilities(
  model: string,
): GeminiModelCapabilities {
  const definition = getGeminiModelDefinition(model)
  if (!definition) {
    return EMPTY_GEMINI_MODEL_CAPABILITIES
  }

  if (definition.uses.includes('image')) {
    return IMAGE_MODEL_DOCUMENTED_CAPABILITIES
  }

  if (definition.uses.includes('computer-use')) {
    return {
      ...EMPTY_GEMINI_MODEL_CAPABILITIES,
      supportsMultimodalInput: true,
      supportsComputerUse: true,
      supportsTokenCounting: true,
    }
  }

  if (definition.value.startsWith('gemini-3')) {
    return GEMINI_3_MAIN_LOOP_DOCUMENTED_CAPABILITIES
  }

  if (definition.uses.includes('main-loop')) {
    return MAIN_LOOP_DOCUMENTED_CAPABILITIES
  }

  if (definition.uses.includes('embedding')) {
    return {
      ...EMPTY_GEMINI_MODEL_CAPABILITIES,
      supportsFileSearch: true,
    }
  }

  return EMPTY_GEMINI_MODEL_CAPABILITIES
}

export function getRoutedGeminiModelCapabilities(
  model: string,
): GeminiModelCapabilities {
  const definition = getGeminiModelDefinition(model)
  if (!definition?.uses.includes('main-loop')) {
    return EMPTY_GEMINI_MODEL_CAPABILITIES
  }
  return ROUTED_GEMINI_MODEL_CAPABILITIES
}

export function validateGeminiModel(model: string): string | null {
  const definition = getGeminiModelDefinition(model)
  if (!definition) {
    return `model \`${model}\` is not available through the Gemini runtime in this build. Supported main-loop models: ${getGeminiMainLoopModelDefinitions().map(item => `\`${item.value}\``).join(', ')}.`
  }
  if (!definition.uses.includes('main-loop')) {
    return `model \`${model}\` is a Gemini ${definition.uses.join('/')} model, not a SeaTurtle main-loop model. Supported main-loop models: ${getGeminiMainLoopModelDefinitions().map(item => `\`${item.value}\``).join(', ')}.`
  }
  return null
}

export function getDefaultGeminiComputerUseModel(): string {
  return (
    process.env.SEATURTLE_GEMINI_COMPUTER_USE_MODEL?.trim() ||
    process.env.GEMINI_COMPUTER_USE_MODEL?.trim() ||
    DEFAULT_GEMINI_COMPUTER_USE_MODEL
  )
}

export function validateGeminiComputerUseModel(model: string): string | null {
  const supportedModels = getGeminiModelDefinitions().filter(
    item =>
      item.uses.includes('computer-use') || item.value === 'gemini-3-flash-preview',
  )
  const definition = getGeminiModelDefinition(model)
  if (!definition) {
    return `Gemini computer use model \`${model}\` is not available in this build. Supported computer-use models: ${supportedModels.map(item => `\`${item.value}\``).join(', ')}.`
  }
  if (
    !definition.uses.includes('computer-use') &&
    definition.value !== 'gemini-3-flash-preview'
  ) {
    return `Gemini computer use model \`${model}\` is not routed for desktop control. Supported computer-use models: ${supportedModels.map(item => `\`${item.value}\``).join(', ')}.`
  }
  return null
}

export function formatGeminiCapabilityLabels(
  capabilities: GeminiModelCapabilities,
): string[] {
  return [
    ...(capabilities.supportsFunctionCalling ? ['function calling'] : []),
    ...(capabilities.supportsMultimodalInput ? ['multimodal input'] : []),
    ...(capabilities.supportsDocuments ? ['documents'] : []),
    ...(capabilities.supportsWebSearch ? ['web search'] : []),
    ...(capabilities.supportsUrlContext ? ['URL context'] : []),
    ...(capabilities.supportsFileSearch ? ['file search'] : []),
    ...(capabilities.supportsRemoteMcp ? ['remote MCP'] : []),
    ...(capabilities.supportsHostedShell ? ['hosted shell'] : []),
    ...(capabilities.supportsCodeExecution ? ['code execution'] : []),
    ...(capabilities.supportsComputerUse ? ['computer use'] : []),
    ...(capabilities.supportsImageGeneration ? ['image generation'] : []),
    ...(capabilities.supportsImageEditing ? ['image editing'] : []),
    ...(capabilities.supportsStructuredOutputs ? ['structured outputs'] : []),
    ...(capabilities.supportsTokenCounting ? ['token counting'] : []),
    ...(capabilities.supportsCachedContent ? ['cached content'] : []),
  ]
}
