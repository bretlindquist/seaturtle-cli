import type {
  BetaJSONOutputFormat,
  BetaContentBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { randomUUID } from 'crypto'
import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import {
  buildGeminiSystemInstruction,
  buildGeminiTools,
  collectGeminiContents,
  parseGeminiAssistantContent,
} from './geminiContent.js'
import {
  runGeminiGenerateContent,
  runGeminiStreamGenerateContent,
} from './geminiClient.js'
import {
  getConfiguredGeminiCachedContent,
  getConfiguredGeminiServiceTier,
} from './geminiCacheConfig.js'
import type {
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiGenerationConfig,
  GeminiPart,
  GeminiTool,
} from './geminiTypes.js'
import { buildGeminiThinkingConfig } from './geminiThinkingConfig.js'
import { validateGeminiRequestAgainstModelLimits } from './geminiRequestGuards.js'
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
import { getResolvedGeminiApiKeyAuth } from '../authProfiles/geminiAuth.js'
import {
  validateGeminiModel,
} from './geminiCapabilityConfig.js'
export {
  getDefaultGeminiComputerUseModel,
  formatGeminiCapabilityLabels,
  getDocumentedGeminiModelCapabilities,
  getGeminiMainLoopModelDefinitions as getGeminiModelDefinitions,
  getRoutedGeminiModelCapabilities,
  validateGeminiComputerUseModel,
  validateGeminiModel,
  type GeminiModelCapabilities,
  type GeminiModelDefinition,
} from './geminiCapabilityConfig.js'
export { validateGeminiImageGenerationModel } from './geminiImageGeneration.js'

type GeminiAuthTarget = {
  baseUrl: string
  apiKey: string
  source: string
}

type GeminiStreamEnvelope = {
  messageId: string
  emittedMessageStart: boolean
  ttftMs?: number
  nextContentBlockIndex: number
  activeTextBlockIndex: number | null
  activeText: string
  activeTextThoughtSignature?: string
  emittedAssistantMessages: AssistantMessage[]
}

const ZERO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
  service_tier: null,
  cache_creation: {
    ephemeral_1h_input_tokens: 0,
    ephemeral_5m_input_tokens: 0,
  },
  inference_geo: null,
  iterations: null,
  speed: null,
}

export function getGeminiApiKeyAuthTarget(): GeminiAuthTarget | null {
  const auth = getResolvedGeminiApiKeyAuth()
  return auth
    ? {
        apiKey: auth.apiKey,
        baseUrl: auth.baseUrl,
        source: auth.source,
      }
    : null
}

async function buildGeminiRequest(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  options: Options
}): Promise<
  | { request: GeminiGenerateContentRequest }
  | { error: string }
> {
  const conversion = collectGeminiContents({
    messages: params.messages,
  })
  if (conversion.validationError) {
    return { error: conversion.validationError }
  }
  const { contents } = conversion
  if (contents.length === 0) {
    return { error: 'Gemini request is missing input messages.' }
  }

  let tools: GeminiTool[]
  try {
    tools = await buildGeminiTools({ tools: params.tools })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  const systemInstruction = buildGeminiSystemInstruction(params.systemPrompt)
  const thinking = buildGeminiThinkingConfig({
    model: params.options.model,
    effortValue: params.options.effortValue,
    thinkingConfig: params.thinkingConfig,
  })
  if ('error' in thinking) {
    return { error: thinking.error }
  }
  const structuredOutput = buildGeminiStructuredOutputConfig(
    params.options.outputFormat,
  )
  if (structuredOutput && 'error' in structuredOutput) {
    return { error: structuredOutput.error }
  }
  const generationConfig: GeminiGenerationConfig = {
    ...(params.options.maxOutputTokensOverride
      ? { maxOutputTokens: params.options.maxOutputTokensOverride }
      : {}),
    ...(thinking.thinkingConfig
      ? { thinkingConfig: thinking.thinkingConfig }
      : {}),
    ...(structuredOutput
      ? {
          responseMimeType: structuredOutput.responseMimeType,
          ...(structuredOutput.responseJsonSchema
            ? { responseJsonSchema: structuredOutput.responseJsonSchema }
            : {}),
        }
      : {}),
  }
  const cachedContent = getConfiguredGeminiCachedContent()
  const serviceTier = getConfiguredGeminiServiceTier()
  const request: GeminiGenerateContentRequest = {
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(tools.length > 0 ? { tools } : {}),
    ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
    ...(cachedContent ? { cachedContent } : {}),
    ...(serviceTier ? { serviceTier } : {}),
  }
  const guardError = validateGeminiRequestAgainstModelLimits({
    model: params.options.model,
    request,
  })
  if (guardError) {
    return { error: guardError }
  }
  return {
    request,
  }
}

function getGeminiAuthOrError(): GeminiAuthTarget | string {
  const auth = getGeminiApiKeyAuthTarget()
  return (
    auth ??
    'Gemini auth is not configured. Use /login to link Gemini in CT, or set GEMINI_API_KEY for an explicit env-driven setup, then retry with `SEATURTLE_MAIN_PROVIDER=gemini`.'
  )
}

function buildGeminiStructuredOutputConfig(
  outputFormat: BetaJSONOutputFormat | undefined,
):
  | {
      responseMimeType: string
      responseJsonSchema?: unknown
    }
  | { error: string }
  | null {
  if (!outputFormat) {
    return null
  }

  if (outputFormat.type !== 'json_schema') {
    return {
      error: `Gemini structured output does not support output format \`${outputFormat.type}\` in this build.`,
    }
  }

  return {
    responseMimeType: 'application/json',
    responseJsonSchema: outputFormat.schema,
  }
}

async function runGeminiPlainText(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  signal: AbortSignal
  model: string
  tools: Tools
  options: Options
}): Promise<AssistantMessage> {
  const auth = getGeminiAuthOrError()
  if (typeof auth === 'string') {
    return createAssistantAPIErrorMessage({ content: auth })
  }

  const modelError = validateGeminiModel(params.model)
  if (modelError) {
    return createAssistantAPIErrorMessage({ content: modelError })
  }

  const request = await buildGeminiRequest(params)
  if ('error' in request) {
    return createAssistantAPIErrorMessage({ content: request.error })
  }

  try {
    const payload = await runGeminiGenerateContent({
      auth,
      model: params.model,
      request: request.request,
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

async function* emitGeminiStreamEvent(
  part: Record<string, unknown>,
  envelope: GeminiStreamEnvelope,
  startTime: number,
): AsyncGenerator<StreamEvent, void> {
  if (part.type === 'message_start') {
    envelope.ttftMs = Date.now() - startTime
  }

  yield {
    type: 'stream_event',
    event: part as StreamEvent['event'],
    ...(part.type === 'message_start' && envelope.ttftMs != null
      ? { ttftMs: envelope.ttftMs }
      : {}),
  }
}

async function* ensureGeminiMessageStart(
  envelope: GeminiStreamEnvelope,
  startTime: number,
  model: string,
): AsyncGenerator<StreamEvent, void> {
  if (envelope.emittedMessageStart) {
    return
  }

  envelope.emittedMessageStart = true
  yield* emitGeminiStreamEvent(
    {
      type: 'message_start',
      message: {
        id: envelope.messageId,
        type: 'message',
        role: 'assistant',
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { ...ZERO_USAGE },
        container: null,
        context_management: null,
      },
    },
    envelope,
    startTime,
  )
}

async function* ensureGeminiTextBlockStart(
  envelope: GeminiStreamEnvelope,
  startTime: number,
  model: string,
): AsyncGenerator<StreamEvent, void> {
  yield* ensureGeminiMessageStart(envelope, startTime, model)
  if (envelope.activeTextBlockIndex != null) {
    return
  }

  envelope.activeTextBlockIndex = envelope.nextContentBlockIndex++
  envelope.activeText = ''
  envelope.activeTextThoughtSignature = undefined
  yield* emitGeminiStreamEvent(
    {
      type: 'content_block_start',
      index: envelope.activeTextBlockIndex,
      content_block: {
        type: 'text',
        text: '',
      },
    },
    envelope,
    startTime,
  )
}

function parseSingleGeminiPart(part: GeminiPart): BetaContentBlock | null {
  return (
    parseGeminiAssistantContent({
      candidates: [
        {
          content: {
            parts: [part],
          },
        },
      ],
    })[0] ?? null
  )
}

async function* flushGeminiTextBlock(
  envelope: GeminiStreamEnvelope,
  startTime: number,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (envelope.activeTextBlockIndex == null || envelope.activeText.length === 0) {
    envelope.activeTextBlockIndex = null
    envelope.activeText = ''
    envelope.activeTextThoughtSignature = undefined
    return
  }

  const contentBlock = parseSingleGeminiPart({
    text: envelope.activeText,
    ...(envelope.activeTextThoughtSignature
      ? { thoughtSignature: envelope.activeTextThoughtSignature }
      : {}),
  })
  if (!contentBlock) {
    return
  }

  const assistantMessage = createAssistantMessage({
    content: [contentBlock],
  })
  assistantMessage.message.stop_reason = null
  envelope.emittedAssistantMessages.push(assistantMessage)
  yield assistantMessage

  yield* emitGeminiStreamEvent(
    {
      type: 'content_block_stop',
      index: envelope.activeTextBlockIndex,
    },
    envelope,
    startTime,
  )

  envelope.activeTextBlockIndex = null
  envelope.activeText = ''
  envelope.activeTextThoughtSignature = undefined
}

async function* emitGeminiToolUse(
  envelope: GeminiStreamEnvelope,
  startTime: number,
  model: string,
  part: GeminiPart,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  yield* flushGeminiTextBlock(envelope, startTime)
  yield* ensureGeminiMessageStart(envelope, startTime, model)

  if (!part.functionCall) {
    return
  }

  const index = envelope.nextContentBlockIndex++
  const id = part.functionCall.id ?? `gemini_call_${index}`
  const name = part.functionCall.name
  const partialJson = JSON.stringify(part.functionCall.args ?? {})
  const contentBlock = parseSingleGeminiPart({
    ...part,
    functionCall: {
      ...part.functionCall,
      id,
    },
  })
  if (!contentBlock) {
    return
  }

  yield* emitGeminiStreamEvent(
    {
      type: 'content_block_start',
      index,
      content_block: {
        type: 'tool_use',
        id,
        name,
        input: {},
      },
    },
    envelope,
    startTime,
  )
  yield* emitGeminiStreamEvent(
    {
      type: 'content_block_delta',
      index,
      delta: {
        type: 'input_json_delta',
        partial_json: partialJson,
      },
    },
    envelope,
    startTime,
  )

  const assistantMessage = createAssistantMessage({
    content: [contentBlock],
  })
  assistantMessage.message.stop_reason = null
  envelope.emittedAssistantMessages.push(assistantMessage)
  yield assistantMessage

  yield* emitGeminiStreamEvent(
    {
      type: 'content_block_stop',
      index,
    },
    envelope,
    startTime,
  )
}

function getGeminiFinishReason(response: GeminiGenerateContentResponse): string | null {
  return response.candidates?.[0]?.finishReason?.toLowerCase() ?? null
}

async function* emitGeminiStreamResponse(
  envelope: GeminiStreamEnvelope,
  startTime: number,
  model: string,
  response: GeminiGenerateContentResponse,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  const parts = response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (typeof part.text === 'string' && part.text.length > 0) {
      yield* ensureGeminiTextBlockStart(envelope, startTime, model)
      envelope.activeText += part.text
      if (part.thoughtSignature) {
        envelope.activeTextThoughtSignature = part.thoughtSignature
      }
      yield* emitGeminiStreamEvent(
        {
          type: 'content_block_delta',
          index: envelope.activeTextBlockIndex,
          delta: {
            type: 'text_delta',
            text: part.text,
          },
        },
        envelope,
        startTime,
      )
      continue
    }

    if (part.functionCall) {
      yield* emitGeminiToolUse(envelope, startTime, model, part)
      continue
    }

    const contentBlock = parseSingleGeminiPart(part)
    if (!contentBlock) {
      continue
    }

    yield* flushGeminiTextBlock(envelope, startTime)
    yield* ensureGeminiMessageStart(envelope, startTime, model)
    const index = envelope.nextContentBlockIndex++
    yield* emitGeminiStreamEvent(
      {
        type: 'content_block_start',
        index,
        content_block: contentBlock,
      },
      envelope,
      startTime,
    )
    const assistantMessage = createAssistantMessage({
      content: [contentBlock],
    })
    assistantMessage.message.stop_reason = null
    envelope.emittedAssistantMessages.push(assistantMessage)
    yield assistantMessage
    yield* emitGeminiStreamEvent(
      {
        type: 'content_block_stop',
        index,
      },
      envelope,
      startTime,
    )
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
    thinkingConfig: params.thinkingConfig,
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
  const auth = getGeminiAuthOrError()
  if (typeof auth === 'string') {
    yield createAssistantAPIErrorMessage({ content: auth })
    return
  }

  const modelError = validateGeminiModel(params.options.model)
  if (modelError) {
    yield createAssistantAPIErrorMessage({ content: modelError })
    return
  }

  const request = await buildGeminiRequest({
    messages: params.messages,
    systemPrompt: params.systemPrompt,
    thinkingConfig: params.thinkingConfig,
    tools: params.tools,
    options: params.options,
  })
  if ('error' in request) {
    yield createAssistantAPIErrorMessage({ content: request.error })
    return
  }

  const envelope: GeminiStreamEnvelope = {
    messageId: randomUUID(),
    emittedMessageStart: false,
    nextContentBlockIndex: 0,
    activeTextBlockIndex: null,
    activeText: '',
    emittedAssistantMessages: [],
  }
  const startTime = Date.now()
  let stopReason: string | null = null

  try {
    for await (const response of runGeminiStreamGenerateContent({
      auth,
      model: params.options.model,
      request: request.request,
      signal: params.signal,
    })) {
      stopReason = getGeminiFinishReason(response) ?? stopReason
      yield* emitGeminiStreamResponse(
        envelope,
        startTime,
        params.options.model,
        response,
      )
    }

    yield* flushGeminiTextBlock(envelope, startTime)

    if (envelope.emittedAssistantMessages.length === 0) {
      throw new Error('Gemini backend returned no assistant content')
    }

    if (!envelope.emittedMessageStart) {
      yield* ensureGeminiMessageStart(envelope, startTime, params.options.model)
    }

    const finalStopReason =
      stopReason ??
      (envelope.emittedAssistantMessages.some(message =>
        message.message.content.some(block => block.type === 'tool_use'),
      )
        ? 'tool_use'
        : 'end_turn')

    yield* emitGeminiStreamEvent(
      {
        type: 'message_delta',
        delta: {
          stop_reason: finalStopReason,
          stop_sequence: null,
        },
        usage: { ...ZERO_USAGE },
      },
      envelope,
      startTime,
    )

    for (const message of envelope.emittedAssistantMessages) {
      message.message.stop_reason = finalStopReason
      message.message.usage = { ...ZERO_USAGE }
    }

    yield* emitGeminiStreamEvent(
      {
        type: 'message_stop',
      },
      envelope,
      startTime,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    yield createAssistantAPIErrorMessage({
      content: message.startsWith(API_ERROR_MESSAGE_PREFIX)
        ? message
        : `${API_ERROR_MESSAGE_PREFIX}: ${message}`,
    })
  }
}
