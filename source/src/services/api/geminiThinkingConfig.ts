import type { ThinkingConfig } from '../../utils/thinking.js'
import { getGeminiModelDefinition } from './geminiCapabilityConfig.js'

type GeminiEffortValue = 'low' | 'medium' | 'high' | 'max' | number

export type GeminiThinkingConfigResult =
  | { thinkingConfig?: Record<string, unknown> }
  | { error: string }

function normalizeEffortLevel(
  effortValue: GeminiEffortValue | undefined,
): 'low' | 'medium' | 'high' | 'max' | undefined {
  if (effortValue === undefined) {
    return undefined
  }
  if (typeof effortValue === 'number') {
    if (effortValue <= 50) return 'low'
    if (effortValue <= 85) return 'medium'
    if (effortValue <= 100) return 'high'
    return 'max'
  }
  return effortValue
}

function isGemini3(model: string): boolean {
  return model.toLowerCase().startsWith('gemini-3')
}

function isGemini3Pro(model: string): boolean {
  const normalized = model.toLowerCase()
  return isGemini3(normalized) && normalized.includes('pro')
}

function isGemini3Flash(model: string): boolean {
  const normalized = model.toLowerCase()
  return isGemini3(normalized) && normalized.includes('flash')
}

function isGemini25(model: string): boolean {
  return model.toLowerCase().startsWith('gemini-2.5')
}

function buildGemini3ThinkingConfig(params: {
  model: string
  effortValue?: GeminiEffortValue
  thinkingConfig: ThinkingConfig
}): GeminiThinkingConfigResult {
  if (params.thinkingConfig.type === 'disabled') {
    if (isGemini3Flash(params.model)) {
      return { thinkingConfig: { thinkingLevel: 'minimal' } }
    }
    return {}
  }

  const level = normalizeEffortLevel(params.effortValue)
  if (!level) {
    return {}
  }

  if (isGemini3Pro(params.model)) {
    return { thinkingConfig: { thinkingLevel: level === 'low' ? 'low' : 'high' } }
  }

  const flashLevel = level === 'max' ? 'high' : level
  return { thinkingConfig: { thinkingLevel: flashLevel } }
}

function buildGemini25ThinkingConfig(params: {
  model: string
  effortValue?: GeminiEffortValue
  thinkingConfig: ThinkingConfig
}): GeminiThinkingConfigResult {
  if (params.thinkingConfig.type === 'disabled') {
    const definition = getGeminiModelDefinition(params.model)
    if (definition && !definition.thinkingCanBeDisabled) {
      return {}
    }
    return { thinkingConfig: { thinkingBudget: 0 } }
  }
  if (params.thinkingConfig.type === 'enabled') {
    return { thinkingConfig: { thinkingBudget: params.thinkingConfig.budgetTokens } }
  }

  const level = normalizeEffortLevel(params.effortValue)
  switch (level) {
    case 'low':
      return { thinkingConfig: { thinkingBudget: 1024 } }
    case 'medium':
      return { thinkingConfig: { thinkingBudget: -1 } }
    case 'high':
      return { thinkingConfig: { thinkingBudget: 8192 } }
    case 'max':
      return { thinkingConfig: { thinkingBudget: 24576 } }
    case undefined:
      return {}
  }
}

export function buildGeminiThinkingConfig(params: {
  model: string
  effortValue?: GeminiEffortValue
  thinkingConfig: ThinkingConfig
}): GeminiThinkingConfigResult {
  if (isGemini3(params.model)) {
    return buildGemini3ThinkingConfig(params)
  }
  if (isGemini25(params.model)) {
    return buildGemini25ThinkingConfig(params)
  }
  return {}
}
