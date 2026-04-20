import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import {
  buildGeminiSystemInstruction,
  buildGeminiTools,
  collectGeminiContents,
  parseGeminiAssistantContent,
} from './geminiContent.js'
import { runGeminiGenerateContent } from './geminiClient.js'
import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
} from '../../types/message.js'
import {
  createAssistantAPIErrorMessage,
  createAssistantMessage,
} from '../../utils/messages.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import type { ThinkingConfig } from '../../utils/thinking.js'
import type { Tools } from '../../Tool.js'
import type { Options } from './claude.js'
import { getDefaultGeminiApiKeyProfile } from '../authProfiles/store.js'
import {
  validateGeminiModel,
} from './geminiCapabilityConfig.js'
export {
  formatGeminiCapabilityLabels,
  getDocumentedGeminiModelCapabilities,
  getGeminiMainLoopModelDefinitions as getGeminiModelDefinitions,
  getRoutedGeminiModelCapabilities,
  validateGeminiModel,
  type GeminiModelCapabilities,
  type GeminiModelDefinition,
} from './geminiCapabilityConfig.js'

type GeminiAuthTarget = {
  baseUrl: string
  apiKey: string
  source: string
}

export function getGeminiApiKeyAuthTarget(): GeminiAuthTarget | null {
  const profile = getDefaultGeminiApiKeyProfile()
  if (profile?.apiKey.trim()) {
    return {
      apiKey: profile.apiKey.trim(),
      baseUrl:
        typeof profile.metadata?.baseUrl === 'string' &&
        profile.metadata.baseUrl.trim()
          ? profile.metadata.baseUrl.trim()
          : 'https://generativelanguage.googleapis.com/v1beta',
      source: 'provider-api-key-profile',
    }
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    baseUrl:
      process.env.GEMINI_BASE_URL?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta',
    source: 'GEMINI_API_KEY',
  }
}

async function runGeminiPlainText(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  signal: AbortSignal
  model: string
  tools: Tools
  options: Options
}): Promise<AssistantMessage> {
  const auth = getGeminiApiKeyAuthTarget()
  if (!auth) {
    return createAssistantAPIErrorMessage({
      content:
        'Gemini auth is not configured. Set GEMINI_API_KEY, then retry with `SEATURTLE_MAIN_PROVIDER=gemini`.',
    })
  }

  const modelError = validateGeminiModel(params.model)
  if (modelError) {
    return createAssistantAPIErrorMessage({ content: modelError })
  }

  const conversion = collectGeminiContents({
    messages: params.messages,
  })
  if (conversion.validationError) {
    return createAssistantAPIErrorMessage({ content: conversion.validationError })
  }
  const { contents } = conversion
  if (contents.length === 0) {
    return createAssistantAPIErrorMessage({
      content: 'Gemini request is missing input messages.',
    })
  }

  const tools = await buildGeminiTools({ tools: params.tools })
  const systemInstruction = buildGeminiSystemInstruction(params.systemPrompt)

  try {
    const payload = await runGeminiGenerateContent({
      auth,
      model: params.model,
      request: {
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(tools.length > 0 ? { tools } : {}),
        ...(params.options.maxOutputTokensOverride
          ? {
              generationConfig: {
                maxOutputTokens: params.options.maxOutputTokensOverride,
              },
            }
          : {}),
      },
      signal: params.signal,
    })
    const content = parseGeminiAssistantContent(payload)
    if (content.length === 0) {
      throw new Error('Gemini backend returned no assistant content')
    }

    return createAssistantMessage({ content })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createAssistantAPIErrorMessage({
      content: message.startsWith(API_ERROR_MESSAGE_PREFIX)
        ? message
        : `${API_ERROR_MESSAGE_PREFIX}: ${message}`,
    })
  }
}

export async function queryGeminiWithoutStreaming(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): Promise<AssistantMessage> {
  return runGeminiPlainText({
    messages: params.messages,
    systemPrompt: params.systemPrompt,
    signal: params.signal,
    model: params.options.model,
    tools: params.tools,
    options: params.options,
  })
}

export async function* queryGeminiWithStreaming(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): AsyncGenerator<
  StreamEvent | AssistantMessage | SystemAPIErrorMessage,
  void
> {
  yield await queryGeminiWithoutStreaming(params)
}
