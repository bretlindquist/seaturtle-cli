import {
  getOpenAiCodexModelDefinitions,
  type OpenAiCodexModelDefinition,
} from '../api/openaiCodex.js'
import {
  getGeminiModelDefinitions,
  type GeminiModelDefinition,
  DEFAULT_GEMINI_MAIN_LOOP_MODEL,
} from '../api/geminiCapabilityConfig.js'

export type ProviderModelFamily = 'anthropic' | 'openai-codex' | 'gemini'
export type ProviderModelRegistryUse =
  | 'main-loop'
  | 'image'
  | 'computer-use'
  | 'embedding'
  | 'live'
  | 'tts'
export type ProviderModelLifecycle =
  | 'stable'
  | 'preview'
  | 'legacy'
  | 'deprecated'
  | 'shut_down'

export type ProviderModelRegistryEntry = {
  provider: ProviderModelFamily
  value: string
  label: string
  description: string
  lifecycle: ProviderModelLifecycle
  uses: readonly ProviderModelRegistryUse[]
  selectableInModelPicker: boolean
}

export type ProviderModelRegistrySnapshot = {
  provider: ProviderModelFamily
  curatedModelCount: number
  curatedSelectableModelCount: number
  recommendedMainModel: string
  discoverySupported: boolean
}

const ANTHROPIC_MODEL_DEFINITIONS: readonly ProviderModelRegistryEntry[] = [
  {
    provider: 'anthropic',
    value: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    description: 'Most capable Anthropic model currently documented by Anthropic',
    lifecycle: 'stable',
    uses: ['main-loop'],
    selectableInModelPicker: true,
  },
  {
    provider: 'anthropic',
    value: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    description: 'Previous Anthropic frontier model kept for compatibility',
    lifecycle: 'legacy',
    uses: ['main-loop'],
    selectableInModelPicker: true,
  },
  {
    provider: 'anthropic',
    value: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    description: 'Best combination of speed and intelligence',
    lifecycle: 'stable',
    uses: ['main-loop'],
    selectableInModelPicker: true,
  },
  {
    provider: 'anthropic',
    value: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    description: 'Fastest Anthropic model for quick answers',
    lifecycle: 'stable',
    uses: ['main-loop'],
    selectableInModelPicker: true,
  },
  {
    provider: 'anthropic',
    value: 'claude-opus-4-1-20250805',
    label: 'Claude Opus 4.1',
    description: 'Legacy Anthropic Opus model kept for compatibility',
    lifecycle: 'legacy',
    uses: ['main-loop'],
    selectableInModelPicker: true,
  },
] as const

function mapOpenAiModelDefinition(
  model: OpenAiCodexModelDefinition,
): ProviderModelRegistryEntry {
  return {
    provider: 'openai-codex',
    value: model.value,
    label: model.label,
    description: model.description,
    lifecycle: 'stable',
    uses: ['main-loop'],
    selectableInModelPicker: true,
  }
}

function mapGeminiModelDefinition(
  model: GeminiModelDefinition,
): ProviderModelRegistryEntry {
  return {
    provider: 'gemini',
    value: model.value,
    label: model.label,
    description: model.description,
    lifecycle:
      model.lifecycle === 'stable'
        ? 'stable'
        : model.lifecycle === 'preview'
          ? 'preview'
          : model.lifecycle === 'deprecated'
            ? 'deprecated'
            : 'shut_down',
    uses: model.uses,
    selectableInModelPicker: model.selectableInModelPicker,
  }
}

export function getCuratedProviderModelEntries(
  provider: ProviderModelFamily,
): readonly ProviderModelRegistryEntry[] {
  switch (provider) {
    case 'anthropic':
      return ANTHROPIC_MODEL_DEFINITIONS
    case 'openai-codex':
      return getOpenAiCodexModelDefinitions().map(mapOpenAiModelDefinition)
    case 'gemini':
      return getGeminiModelDefinitions().map(mapGeminiModelDefinition)
  }
}

export function getRecommendedMainModelForProvider(
  provider: ProviderModelFamily,
): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-opus-4-7'
    case 'openai-codex':
      return 'gpt-5.4'
    case 'gemini':
      return DEFAULT_GEMINI_MAIN_LOOP_MODEL
  }
}

export function getProviderModelRegistrySnapshot(
  provider: ProviderModelFamily,
): ProviderModelRegistrySnapshot {
  const entries = getCuratedProviderModelEntries(provider)
  return {
    provider,
    curatedModelCount: entries.length,
    curatedSelectableModelCount: entries.filter(
      entry => entry.selectableInModelPicker,
    ).length,
    recommendedMainModel: getRecommendedMainModelForProvider(provider),
    discoverySupported: true,
  }
}
