import type {
  BetaContentBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { randomUUID } from 'crypto'
import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import {
  normalizeOpenAiToolParameterSchema,
  shouldUseStrictOpenAiToolSchema,
} from './openaiToolSchema.js'
import { readExternalCodexCliAuth } from '../authProfiles/store.js'
import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
  UserMessage,
} from '../../types/message.js'
import {
  createAssistantAPIErrorMessage,
  createAssistantMessage,
} from '../../utils/messages.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import type { ThinkingConfig } from '../../utils/thinking.js'
import { resolveAppliedEffort } from '../../utils/effort.js'
import type { Tools } from '../../Tool.js'
import { zodToJsonSchema } from '../../utils/zodToJsonSchema.js'
import { formatDuration } from '../../utils/format.js'
import type { Options } from './claude.js'

const DEFAULT_CHATGPT_CODEX_BASE_URL =
  'https://chatgpt.com/backend-api/codex'

export type OpenAiCodexModelDefinition = {
  value: string
  label: string
  description: string
  descriptionForModel: string
}

export const OPENAI_CODEX_MODEL_DEFINITIONS: readonly OpenAiCodexModelDefinition[] =
  [
    {
      value: 'gpt-5.4',
      label: 'GPT-5.4',
      description: 'Latest frontier agentic coding model',
      descriptionForModel: 'GPT-5.4 - latest frontier agentic coding model',
    },
    {
      value: 'gpt-5.4-mini',
      label: 'GPT-5.4 Mini',
      description: 'Smaller frontier agentic coding model',
      descriptionForModel:
        'GPT-5.4 Mini - smaller frontier agentic coding model',
    },
    {
      value: 'gpt-5.3-codex',
      label: 'GPT-5.3 Codex',
      description: 'Frontier Codex-optimized agentic coding model',
      descriptionForModel:
        'GPT-5.3 Codex - frontier Codex-optimized agentic coding model',
    },
    {
      value: 'gpt-5.2-codex',
      label: 'GPT-5.2 Codex',
      description: 'Frontier agentic coding model',
      descriptionForModel: 'GPT-5.2 Codex - frontier agentic coding model',
    },
    {
      value: 'gpt-5.2',
      label: 'GPT-5.2',
      description: 'Optimized for professional work and long-running agents',
      descriptionForModel:
        'GPT-5.2 - optimized for professional work and long-running agents',
    },
    {
      value: 'gpt-5.1-codex-max',
      label: 'GPT-5.1 Codex Max',
      description: 'Codex-optimized model for deep and fast reasoning',
      descriptionForModel:
        'GPT-5.1 Codex Max - Codex-optimized model for deep and fast reasoning',
    },
    {
      value: 'gpt-5.1-codex-mini',
      label: 'GPT-5.1 Codex Mini',
      description: 'Optimized for codex. Cheaper, faster, but less capable',
      descriptionForModel:
        'GPT-5.1 Codex Mini - optimized for codex. Cheaper, faster, but less capable',
    },
  ] as const

const KNOWN_CHATGPT_CODEX_MODELS = new Set(
  OPENAI_CODEX_MODEL_DEFINITIONS.map(model => model.value),
)

export function getOpenAiCodexModelDefinitions(): readonly OpenAiCodexModelDefinition[] {
  return OPENAI_CODEX_MODEL_DEFINITIONS
}

type ChatgptCodexAuth = {
  accessToken: string
  accountId: string
}

type OpenAiCodexReasoningPayload = {
  effort: 'low' | 'medium' | 'high' | 'xhigh'
}

type OpenAiCodexTextPart = {
  type: 'input_text' | 'output_text'
  text: string
}

type OpenAiCodexInputItem = {
  type: 'message'
  role: 'user' | 'assistant'
  content: OpenAiCodexTextPart[]
}

type OpenAiCodexFunctionCallItem = {
  type: 'function_call'
  name: string
  call_id: string
  arguments: string
}

type OpenAiCodexFunctionCallOutputItem = {
  type: 'function_call_output'
  call_id: string
  output: string | OpenAiCodexTextPart[]
}

type OpenAiCodexRequestItem =
  | OpenAiCodexInputItem
  | OpenAiCodexFunctionCallItem
  | OpenAiCodexFunctionCallOutputItem

type ChatgptSseEvent = {
  type?: string
  delta?: string
  item?: unknown
  response?: unknown
}

type OpenAiCodexHttpErrorBody = {
  error?: {
    type?: string
    message?: string
    plan_type?: string | null
    resets_at?: number | string | null
    resets_in_seconds?: number | null
  }
}

type SyntheticStreamEnvelope = {
  messageId: string
  emittedMessageStart: boolean
  ttftMs?: number
  nextContentBlockIndex: number
  activeTextBlockIndex: number | null
  activeText: string
  completedBlocks: BetaContentBlock[]
  emittedAssistantMessages: AssistantMessage[]
}

type PendingSyntheticToolUse = {
  callId: string
  itemId: string | null
  name: string
  index: number | null
  partialJson: string
  finalArguments: string | null
  finalized: boolean
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

function parseOpenAiCodexHttpErrorBody(
  body: string,
): OpenAiCodexHttpErrorBody | null {
  if (!body) {
    return null
  }

  try {
    return JSON.parse(body) as OpenAiCodexHttpErrorBody
  } catch {
    return null
  }
}

function capitalizePlanType(planType: string | null | undefined): string | null {
  if (!planType) {
    return null
  }

  return planType
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part[0]!.toUpperCase() + part.slice(1))
    .join(' ')
}

function formatOpenAiCodexHttpError(params: {
  status: number
  statusText: string
  body: string
}): string {
  const parsed = parseOpenAiCodexHttpErrorBody(params.body)
  const error = parsed?.error

  if (params.status === 429 && error?.type === 'usage_limit_reached') {
    const planLabel = capitalizePlanType(error.plan_type)
    const resetIn =
      typeof error.resets_in_seconds === 'number' && error.resets_in_seconds > 0
        ? formatDuration(error.resets_in_seconds * 1000, {
            hideTrailingZeros: true,
            mostSignificantOnly: false,
          })
        : null
    const resetAt =
      error.resets_at !== null && error.resets_at !== undefined
        ? Number(error.resets_at)
        : null
    const absoluteReset =
      resetAt && Number.isFinite(resetAt)
        ? new Date(resetAt * 1000).toLocaleString()
        : null

    const parts = [
      `${API_ERROR_MESSAGE_PREFIX}: OpenAI/Codex usage limit reached${planLabel ? ` for your ${planLabel} plan` : ''}.`,
      resetIn ? `Try again in about ${resetIn}.` : null,
      absoluteReset ? `Resets at ${absoluteReset}.` : null,
    ].filter(Boolean)

    return parts.join(' ')
  }

  if (typeof error?.message === 'string' && error.message.trim().length > 0) {
    return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText} · ${error.message.trim()}`
  }

  return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText}${params.body ? ` · ${params.body}` : ''}`
}

function resolveChatgptCodexBaseUrl(): string {
  return (
    process.env.CODEX_CHATGPT_BASE_URL || DEFAULT_CHATGPT_CODEX_BASE_URL
  ).replace(/\/+$/, '')
}

function normalizeTextParts(
  content: unknown,
  role: 'user' | 'assistant',
): OpenAiCodexTextPart[] {
  const partType = role === 'assistant' ? 'output_text' : 'input_text'

  if (typeof content === 'string') {
    return content.length > 0 ? [{ type: partType, text: content }] : []
  }

  if (!Array.isArray(content)) {
    return []
  }

  return content.flatMap(part => {
    if (!part || typeof part !== 'object') {
      return []
    }

    const text =
      typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : null
    const type = (part as { type?: unknown }).type

    if (
      text &&
      (type === 'text' || type === 'input_text' || type === 'output_text')
    ) {
      return [{ type: partType, text }]
    }

    return []
  })
}

function flushMessageItem(
  items: OpenAiCodexRequestItem[],
  role: 'user' | 'assistant',
  content: OpenAiCodexTextPart[],
): void {
  if (content.length === 0) {
    return
  }

  items.push({
    type: 'message',
    role,
    content: [...content],
  })
  content.length = 0
}

function convertToolResultContent(
  content: unknown,
): string | OpenAiCodexTextPart[] {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  const parts = content.flatMap(part => {
    if (!part || typeof part !== 'object') {
      return []
    }

    const text =
      typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : null

    if (text) {
      return [{ type: 'input_text' as const, text }]
    }

    if ('content' in part || 'value' in part) {
      return [
        {
          type: 'input_text' as const,
          text: JSON.stringify(part),
        },
      ]
    }

    return []
  })

  return parts.length > 0 ? parts : ''
}

function convertMessage(
  message: UserMessage | AssistantMessage,
  items: OpenAiCodexRequestItem[],
): void {
  const role = message.type === 'assistant' ? 'assistant' : 'user'
  const contentBlocks = Array.isArray(message.message.content)
    ? message.message.content
    : [{ type: 'text', text: message.message.content }]
  const content: OpenAiCodexTextPart[] = []

  for (const block of contentBlocks) {
    if (!block || typeof block !== 'object') {
      continue
    }

    const type = (block as { type?: unknown }).type
    if (
      typeof (block as { text?: unknown }).text === 'string' &&
      (type === 'text' || type === 'input_text' || type === 'output_text')
    ) {
      content.push(
        ...normalizeTextParts([block], role),
      )
      continue
    }

    if (type === 'tool_use' && role === 'assistant') {
      flushMessageItem(items, role, content)
      items.push({
        type: 'function_call',
        name:
          typeof (block as { name?: unknown }).name === 'string'
            ? (block as { name: string }).name
            : 'unknown_tool',
        call_id:
          typeof (block as { id?: unknown }).id === 'string'
            ? (block as { id: string }).id
            : 'missing_tool_id',
        arguments: JSON.stringify(
          typeof (block as { input?: unknown }).input === 'object' &&
            (block as { input?: unknown }).input !== null
            ? (block as { input: unknown }).input
            : {},
        ),
      })
      continue
    }

    if (type === 'tool_result' && role === 'user') {
      flushMessageItem(items, role, content)
      items.push({
        type: 'function_call_output',
        call_id:
          typeof (block as { tool_use_id?: unknown }).tool_use_id === 'string'
            ? (block as { tool_use_id: string }).tool_use_id
            : 'missing_tool_result_id',
        output: convertToolResultContent(
          (block as { content?: unknown }).content,
        ),
      })
    }
  }

  flushMessageItem(items, role, content)
}

function collectOpenAiCodexInputItems(messages: Message[]): OpenAiCodexRequestItem[] {
  const items: OpenAiCodexRequestItem[] = []
  for (const message of messages) {
    if (message.type !== 'user' && message.type !== 'assistant') {
      continue
    }
    convertMessage(message, items)
  }
  return items
}

async function buildOpenAiCodexTools(params: {
  tools: Tools
}): Promise<
  Array<{
    type: 'function'
    name: string
    description?: string
    parameters: unknown
    strict?: boolean
  }>
> {
  return params.tools.flatMap(tool => {
    if (typeof tool.name !== 'string' || !tool.name) {
      return []
    }

    const schema =
      'inputJSONSchema' in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : zodToJsonSchema(tool.inputSchema)

    const parameters = normalizeOpenAiToolParameterSchema(schema ?? {})

    return [
      {
        type: 'function' as const,
        name: tool.name,
        parameters,
        ...(shouldUseStrictOpenAiToolSchema({
          toolName: tool.name,
          strict: tool.strict,
          parameters,
        })
          ? { strict: true }
          : {}),
      },
    ]
  })
}

function buildInstructions(systemPrompt: SystemPrompt): string {
  return systemPrompt.join('\n\n').trim()
}

function responsesEndpoint(baseUrl: string): string {
  return baseUrl.endsWith('/responses') ? baseUrl : `${baseUrl}/responses`
}

function buildOpenAiCodexReasoningPayload(options: Options):
  | OpenAiCodexReasoningPayload
  | undefined {
  const resolvedEffort = resolveAppliedEffort(options.model, options.effortValue)
  if (resolvedEffort === undefined || typeof resolvedEffort !== 'string') {
    return undefined
  }

  return {
    effort: resolvedEffort === 'max' ? 'xhigh' : resolvedEffort,
  }
}

function parseSsePayload(frame: string): string | null {
  const lines = frame
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)

  const dataLines = lines
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).trim())

  if (dataLines.length === 0) {
    return null
  }

  const payload = dataLines.join('\n')
  return payload === '[DONE]' ? null : payload
}

function nextSseFrame(buffer: string): { frame: string; rest: string } | null {
  const index = buffer.search(/\r?\n\r?\n/)
  if (index === -1) {
    return null
  }

  const separatorMatch = buffer.slice(index).match(/^\r?\n\r?\n/)
  const separatorLength = separatorMatch?.[0].length ?? 2
  return {
    frame: buffer.slice(0, index),
    rest: buffer.slice(index + separatorLength),
  }
}

function outputItemText(item: unknown): string {
  if (!item || typeof item !== 'object') {
    return ''
  }

  const content = (item as { content?: unknown }).content
  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .flatMap(part => {
      if (!part || typeof part !== 'object') {
        return []
      }
      return (part as { type?: unknown; text?: unknown }).type === 'output_text' &&
        typeof (part as { text?: unknown }).text === 'string'
        ? [(part as { text: string }).text]
        : []
    })
    .join('')
}

function parseFunctionCallInput(argumentsPayload: unknown): Record<string, unknown> {
  if (typeof argumentsPayload !== 'string' || argumentsPayload.trim().length === 0) {
    return {}
  }

  try {
    const parsed = JSON.parse(argumentsPayload)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

async function* emitSyntheticStreamEvent(
  part: Record<string, unknown>,
  envelope: SyntheticStreamEnvelope,
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

async function* ensureSyntheticMessageStart(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
): AsyncGenerator<StreamEvent, void> {
  if (envelope.emittedMessageStart) {
    return
  }

  envelope.emittedMessageStart = true
  yield* emitSyntheticStreamEvent(
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

async function* ensureSyntheticTextBlockStart(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
): AsyncGenerator<StreamEvent, void> {
  yield* ensureSyntheticMessageStart(envelope, startTime, model)
  if (envelope.activeTextBlockIndex != null) {
    return
  }

  envelope.activeTextBlockIndex = envelope.nextContentBlockIndex++
  envelope.activeText = ''
  yield* emitSyntheticStreamEvent(
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

async function* flushSyntheticTextBlock(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (envelope.activeTextBlockIndex == null || envelope.activeText.length === 0) {
    envelope.activeTextBlockIndex = null
    envelope.activeText = ''
    return
  }

  const contentBlock: BetaContentBlock = {
    type: 'text',
    text: envelope.activeText,
  } as BetaContentBlock
  envelope.completedBlocks.push(contentBlock)

  const assistantMessage = createAssistantMessage({
    content: [contentBlock],
  })
  assistantMessage.message.stop_reason = null
  envelope.emittedAssistantMessages.push(assistantMessage)

  yield assistantMessage
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_stop',
      index: envelope.activeTextBlockIndex,
    },
    envelope,
    startTime,
  )

  envelope.activeTextBlockIndex = null
  envelope.activeText = ''
}

async function* emitSyntheticToolUse(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  item: {
    call_id?: unknown
    name?: unknown
    arguments?: unknown
  },
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  yield* flushSyntheticTextBlock(envelope, startTime)
  yield* ensureSyntheticMessageStart(envelope, startTime, model)

  const index = envelope.nextContentBlockIndex++
  const callId =
    typeof item.call_id === 'string' ? item.call_id : 'missing_tool_id'
  const name = typeof item.name === 'string' ? item.name : 'unknown_tool'
  const partialJson =
    typeof item.arguments === 'string' ? item.arguments : '{}'
  const contentBlock: BetaContentBlock = {
    type: 'tool_use',
    id: callId,
    name,
    input: parseFunctionCallInput(item.arguments),
  } as BetaContentBlock

  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_start',
      index,
      content_block: {
        type: 'tool_use',
        id: callId,
        name,
        input: {},
      },
    },
    envelope,
    startTime,
  )
  yield* emitSyntheticStreamEvent(
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
  envelope.completedBlocks.push(contentBlock)
  envelope.emittedAssistantMessages.push(assistantMessage)
  yield assistantMessage

  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_stop',
      index,
    },
    envelope,
    startTime,
  )
}

async function* ensureSyntheticToolUseStart(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  yield* flushSyntheticTextBlock(envelope, startTime)
  yield* ensureSyntheticMessageStart(envelope, startTime, model)

  if (pendingToolUse.index != null) {
    return
  }

  pendingToolUse.index = envelope.nextContentBlockIndex++
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_start',
      index: pendingToolUse.index,
      content_block: {
        type: 'tool_use',
        id: pendingToolUse.callId,
        name: pendingToolUse.name,
        input: {},
      },
    },
    envelope,
    startTime,
  )
}

function canRenderPendingSyntheticToolUse(
  pendingToolUse: PendingSyntheticToolUse,
): boolean {
  return (
    pendingToolUse.callId !== 'missing_tool_id' &&
    pendingToolUse.name !== 'unknown_tool'
  )
}

function mergePendingSyntheticToolUseMetadata(
  pendingToolUse: PendingSyntheticToolUse,
  item: {
    id?: unknown
    name?: unknown
    arguments?: unknown
  },
): void {
  if (typeof item.id === 'string') {
    pendingToolUse.itemId = item.id
  }

  if (typeof item.name === 'string') {
    pendingToolUse.name = item.name
  }

  if (
    pendingToolUse.partialJson.length === 0 &&
    typeof item.arguments === 'string'
  ) {
    pendingToolUse.partialJson = item.arguments
  }
}

async function* flushBufferedSyntheticToolUseDelta(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
  latestDelta?: string,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (
    !canRenderPendingSyntheticToolUse(pendingToolUse) ||
    pendingToolUse.partialJson.length === 0
  ) {
    return
  }

  const shouldEmitFullBuffer = pendingToolUse.index == null
  yield* ensureSyntheticToolUseStart(
    envelope,
    startTime,
    model,
    pendingToolUse,
  )

  const partialJson = shouldEmitFullBuffer
    ? pendingToolUse.partialJson
    : (latestDelta ?? '')
  if (partialJson.length === 0) {
    return
  }

  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_delta',
      index: pendingToolUse.index ?? 0,
      delta: {
        type: 'input_json_delta',
        partial_json: partialJson,
      },
    },
    envelope,
    startTime,
  )
}

async function* emitSyntheticToolUseDelta(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
  delta: string,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (delta.length === 0) {
    return
  }

  pendingToolUse.partialJson += delta
  yield* flushBufferedSyntheticToolUseDelta(
    envelope,
    startTime,
    model,
    pendingToolUse,
    delta,
  )
}

async function* finalizeSyntheticToolUse(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
  finalArguments?: string,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (pendingToolUse.finalized) {
    return
  }

  const finalJson =
    typeof finalArguments === 'string'
      ? finalArguments
      : pendingToolUse.partialJson

  if (!canRenderPendingSyntheticToolUse(pendingToolUse)) {
    pendingToolUse.partialJson = finalJson
    pendingToolUse.finalArguments = finalJson
    return
  }

  const shouldEmitFullBuffer = pendingToolUse.index == null
  yield* ensureSyntheticToolUseStart(
    envelope,
    startTime,
    model,
    pendingToolUse,
  )

  if (
    shouldEmitFullBuffer &&
    finalJson.length > 0
  ) {
    pendingToolUse.partialJson = finalJson
    yield* emitSyntheticStreamEvent(
      {
        type: 'content_block_delta',
        index: pendingToolUse.index ?? 0,
        delta: {
          type: 'input_json_delta',
          partial_json: finalJson,
        },
      },
      envelope,
      startTime,
    )
  } else if (
    finalJson.length > pendingToolUse.partialJson.length &&
    finalJson.startsWith(pendingToolUse.partialJson)
  ) {
    const delta = finalJson.slice(pendingToolUse.partialJson.length)
    pendingToolUse.partialJson = finalJson
    yield* emitSyntheticStreamEvent(
      {
        type: 'content_block_delta',
        index: pendingToolUse.index ?? 0,
        delta: {
          type: 'input_json_delta',
          partial_json: delta,
        },
      },
      envelope,
      startTime,
    )
  } else if (pendingToolUse.partialJson.length === 0) {
    pendingToolUse.partialJson = finalJson
    if (finalJson.length > 0) {
      yield* emitSyntheticStreamEvent(
        {
          type: 'content_block_delta',
          index: pendingToolUse.index ?? 0,
          delta: {
            type: 'input_json_delta',
            partial_json: finalJson,
          },
        },
        envelope,
        startTime,
      )
    }
  }

  const contentBlock: BetaContentBlock = {
    type: 'tool_use',
    id: pendingToolUse.callId,
    name: pendingToolUse.name,
    input: parseFunctionCallInput(pendingToolUse.partialJson),
  } as BetaContentBlock
  const assistantMessage = createAssistantMessage({
    content: [contentBlock],
  })
  assistantMessage.message.stop_reason = null

  envelope.completedBlocks.push(contentBlock)
  envelope.emittedAssistantMessages.push(assistantMessage)
  pendingToolUse.finalized = true

  yield assistantMessage
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_stop',
      index: pendingToolUse.index ?? 0,
    },
    envelope,
    startTime,
  )
}

async function collectChatgptCodexText(params: {
  auth: ChatgptCodexAuth
  baseUrl: string
  messages: Message[]
  systemPrompt: SystemPrompt
  signal: AbortSignal
  model: string
  tools: Tools
  options: Options
}): Promise<BetaContentBlock[]> {
  const input = collectOpenAiCodexInputItems(params.messages)
  if (input.length === 0) {
    throw new Error('OpenAI/Codex request is missing input messages')
  }
  const tools = await buildOpenAiCodexTools({
    tools: params.tools,
  })
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)

  const response = await fetch(responsesEndpoint(params.baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      authorization: `Bearer ${params.auth.accessToken}`,
      'ChatGPT-Account-ID': params.auth.accountId,
      originator: 'claude_code_source_build',
    },
    body: JSON.stringify({
      model: params.model,
      instructions: buildInstructions(params.systemPrompt),
      input,
      tools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
      ...(reasoning ? { reasoning } : {}),
      store: false,
      stream: true,
      include: ['reasoning.encrypted_content'],
    }),
    signal: params.signal,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      formatOpenAiCodexHttpError({
        status: response.status,
        statusText: response.statusText,
        body,
      }),
    )
  }

  const raw = await response.text()
  let remainder = raw
  let pendingText = ''
  const content: BetaContentBlock[] = []

  while (true) {
    const frame = nextSseFrame(remainder)
    if (!frame) {
      break
    }
    remainder = frame.rest
    const payload = parseSsePayload(frame.frame)
    if (!payload) {
      continue
    }

    const event = JSON.parse(payload) as ChatgptSseEvent
    switch (event.type) {
      case 'response.output_text.delta':
        if (typeof event.delta === 'string') {
          pendingText += event.delta
        }
        break
      case 'response.output_item.done': {
        const itemText = outputItemText(event.item)
        const itemType =
          event.item && typeof event.item === 'object'
            ? (event.item as { type?: unknown }).type
            : null
        if (itemType === 'function_call') {
          if (pendingText.length > 0) {
            content.push({
              type: 'text',
              text: pendingText,
            } as BetaContentBlock)
            pendingText = ''
          }
          const item = event.item as {
            call_id?: unknown
            name?: unknown
            arguments?: unknown
          }
          content.push({
            type: 'tool_use',
            id:
              typeof item.call_id === 'string'
                ? item.call_id
                : 'missing_tool_id',
            name:
              typeof item.name === 'string' ? item.name : 'unknown_tool',
            input:
              typeof item.arguments === 'string' && item.arguments.trim().length > 0
                ? JSON.parse(item.arguments)
                : {},
          } as BetaContentBlock)
        } else if (pendingText.length > 0) {
          content.push({
            type: 'text',
            text: pendingText,
          } as BetaContentBlock)
          pendingText = ''
        } else if (itemText.length > 0) {
          content.push({
            type: 'text',
            text: itemText,
          } as BetaContentBlock)
        }
        break
      }
      case 'response.failed': {
        const message =
          event.response &&
          typeof event.response === 'object' &&
          typeof (event.response as { error?: { message?: unknown } }).error
            ?.message === 'string'
            ? ((event.response as { error: { message: string } }).error.message)
            : 'OpenAI/Codex backend returned response.failed'
        throw new Error(message)
      }
      case 'response.incomplete':
        throw new Error('OpenAI/Codex backend returned an incomplete response')
      default:
        break
    }
  }

  if (pendingText.length > 0) {
    content.push({
      type: 'text',
      text: pendingText,
    } as BetaContentBlock)
  }

  if (content.length === 0) {
    throw new Error('OpenAI/Codex backend returned no assistant content')
  }

  return content
}

export function validateOpenAiCodexModel(model: string): string | null {
  return KNOWN_CHATGPT_CODEX_MODELS.has(model)
    ? null
    : `model \`${model}\` is not available through ChatGPT-backed Codex OAuth in this build. Supported models: ${OPENAI_CODEX_MODEL_DEFINITIONS.map(item => `\`${item.value}\``).join(', ')}.`
}

async function runOpenAiCodexPlainText(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  signal: AbortSignal
  model: string
  tools: Tools
  options: Options
}): Promise<AssistantMessage> {
  const auth = readExternalCodexCliAuth()
  if (!auth) {
    return createAssistantAPIErrorMessage({
      content:
        'OpenAI/Codex OAuth is not configured. Run `codex login` first, then retry with `CLAUDE_CODE_USE_OPENAI_CODEX=1`.',
    })
  }

  const modelError = validateOpenAiCodexModel(params.model)
  if (modelError) {
    return createAssistantAPIErrorMessage({
      content: modelError,
    })
  }

  try {
    const text = await collectChatgptCodexText({
      tools: params.tools,
      options: params.options,
      auth,
      baseUrl: resolveChatgptCodexBaseUrl(),
      messages: params.messages,
      systemPrompt: params.systemPrompt,
      signal: params.signal,
      model: params.model,
    })
    return createAssistantMessage({ content: text })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createAssistantAPIErrorMessage({
      content: message.startsWith(API_ERROR_MESSAGE_PREFIX)
        ? message
        : `${API_ERROR_MESSAGE_PREFIX}: ${message}`,
    })
  }
}

export async function queryOpenAiCodexWithoutStreaming(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): Promise<AssistantMessage> {
  return runOpenAiCodexPlainText({
    messages: params.messages,
    systemPrompt: params.systemPrompt,
    signal: params.signal,
    model: params.options.model,
    tools: params.tools,
    options: params.options,
  })
}

export async function* queryOpenAiCodexWithStreaming(params: {
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
  const auth = readExternalCodexCliAuth()
  if (!auth) {
    yield createAssistantAPIErrorMessage({
      content:
        'OpenAI/Codex OAuth is not configured. Run `codex login` first, then retry with `CLAUDE_CODE_USE_OPENAI_CODEX=1`.',
    })
    return
  }

  const modelError = validateOpenAiCodexModel(params.options.model)
  if (modelError) {
    yield createAssistantAPIErrorMessage({
      content: modelError,
    })
    return
  }

  const input = collectOpenAiCodexInputItems(params.messages)
  if (input.length === 0) {
    yield createAssistantAPIErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: OpenAI/Codex request is missing input messages`,
    })
    return
  }

  const tools = await buildOpenAiCodexTools({
    tools: params.tools,
  })
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)

  try {
    const response = await fetch(responsesEndpoint(resolveChatgptCodexBaseUrl()), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        authorization: `Bearer ${auth.accessToken}`,
        'ChatGPT-Account-ID': auth.accountId,
        originator: 'claude_code_source_build',
      },
      body: JSON.stringify({
        model: params.options.model,
        instructions: buildInstructions(params.systemPrompt),
        input,
        tools,
        tool_choice: 'auto',
        parallel_tool_calls: false,
        ...(reasoning ? { reasoning } : {}),
        store: false,
        stream: true,
        include: ['reasoning.encrypted_content'],
      }),
      signal: params.signal,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        formatOpenAiCodexHttpError({
          status: response.status,
          statusText: response.statusText,
          body,
        }),
      )
    }

    if (!response.body) {
      throw new Error('OpenAI/Codex backend did not provide a streaming body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let remainder = ''
    const startTime = Date.now()
    const envelope: SyntheticStreamEnvelope = {
      messageId: randomUUID(),
      emittedMessageStart: false,
      nextContentBlockIndex: 0,
      activeTextBlockIndex: null,
      activeText: '',
      completedBlocks: [],
      emittedAssistantMessages: [],
    }
    let stopReason: 'end_turn' | 'tool_use' = 'end_turn'
    const pendingToolUseByCallId = new Map<string, PendingSyntheticToolUse>()

    while (true) {
      const { done, value } = await reader.read()
      remainder += decoder.decode(value ?? new Uint8Array(), { stream: !done })

      while (true) {
        const frame = nextSseFrame(remainder)
        if (!frame) {
          break
        }
        remainder = frame.rest
        const payload = parseSsePayload(frame.frame)
        if (!payload) {
          continue
        }

        const event = JSON.parse(payload) as ChatgptSseEvent
        switch (event.type) {
          case 'response.output_item.added': {
            const item =
              event.item && typeof event.item === 'object'
                ? (event.item as {
                    type?: unknown
                    id?: unknown
                    call_id?: unknown
                    name?: unknown
                    arguments?: unknown
                  })
                : null
            if (item?.type === 'function_call') {
              const callId =
                typeof item.call_id === 'string'
                  ? item.call_id
                  : 'missing_tool_id'
              const pendingToolUse = pendingToolUseByCallId.get(callId) ?? {
                callId,
                itemId: null,
                name: 'unknown_tool',
                index: null,
                partialJson: '',
                finalArguments: null,
                finalized: false,
              }
              mergePendingSyntheticToolUseMetadata(pendingToolUse, item)
              pendingToolUseByCallId.set(callId, pendingToolUse)
              yield* flushBufferedSyntheticToolUseDelta(
                envelope,
                startTime,
                params.options.model,
                pendingToolUse,
              )
            }
            break
          }
          case 'response.output_text.delta':
            if (typeof event.delta === 'string' && event.delta.length > 0) {
              yield* ensureSyntheticTextBlockStart(
                envelope,
                startTime,
                params.options.model,
              )
              envelope.activeText += event.delta
              stopReason = 'end_turn'
              yield* emitSyntheticStreamEvent(
                {
                  type: 'content_block_delta',
                  index: envelope.activeTextBlockIndex ?? 0,
                  delta: {
                    type: 'text_delta',
                    text: event.delta,
                  },
                },
                envelope,
                startTime,
              )
            }
            break
          case 'response.function_call_arguments.delta': {
            const callId =
              typeof (event as { call_id?: unknown }).call_id === 'string'
                ? ((event as { call_id: string }).call_id as string)
                : 'missing_tool_id'
            const delta =
              typeof event.delta === 'string' ? event.delta : ''
            const pendingToolUse =
              pendingToolUseByCallId.get(callId) ?? {
                callId,
                itemId: null,
                name: 'unknown_tool',
                index: null,
                partialJson: '',
                finalArguments: null,
                finalized: false,
              }
            pendingToolUseByCallId.set(callId, pendingToolUse)
            stopReason = 'tool_use'
            yield* emitSyntheticToolUseDelta(
              envelope,
              startTime,
              params.options.model,
              pendingToolUse,
              delta,
            )
            break
          }
          case 'response.function_call_arguments.done': {
            const callId =
              typeof (event as { call_id?: unknown }).call_id === 'string'
                ? ((event as { call_id: string }).call_id as string)
                : 'missing_tool_id'
            const finalArguments =
              event &&
              typeof event === 'object' &&
              typeof (event as { arguments?: unknown }).arguments === 'string'
                ? ((event as { arguments: string }).arguments as string)
                : undefined
            const pendingToolUse =
              pendingToolUseByCallId.get(callId) ?? {
                callId,
                itemId: null,
                name: 'unknown_tool',
                index: null,
                partialJson: '',
                finalArguments: null,
                finalized: false,
              }
            pendingToolUseByCallId.set(callId, pendingToolUse)
            stopReason = 'tool_use'
            pendingToolUse.finalArguments =
              finalArguments ?? pendingToolUse.partialJson
            if (canRenderPendingSyntheticToolUse(pendingToolUse)) {
              yield* finalizeSyntheticToolUse(
                envelope,
                startTime,
                params.options.model,
                pendingToolUse,
                pendingToolUse.finalArguments,
              )
            }
            break
          }
          case 'response.output_item.done': {
            const itemType =
              event.item && typeof event.item === 'object'
                ? (event.item as { type?: unknown }).type
                : null
            if (itemType === 'function_call') {
              stopReason = 'tool_use'
              const item = (event.item ?? {}) as {
                call_id?: unknown
                name?: unknown
                arguments?: unknown
                id?: unknown
              }
              const callId =
                typeof item.call_id === 'string'
                  ? item.call_id
                  : 'missing_tool_id'
              const pendingToolUse = pendingToolUseByCallId.get(callId)
              if (pendingToolUse) {
                mergePendingSyntheticToolUseMetadata(pendingToolUse, item)
                yield* finalizeSyntheticToolUse(
                  envelope,
                  startTime,
                  params.options.model,
                  pendingToolUse,
                  pendingToolUse.finalArguments ??
                    (typeof item.arguments === 'string'
                      ? item.arguments
                      : undefined),
                )
              } else {
                yield* emitSyntheticToolUse(
                  envelope,
                  startTime,
                  params.options.model,
                  item,
                )
              }
            } else {
              const itemText = outputItemText(event.item)
              if (
                envelope.activeTextBlockIndex == null &&
                itemText.length > 0
              ) {
                yield* ensureSyntheticTextBlockStart(
                  envelope,
                  startTime,
                  params.options.model,
                )
                envelope.activeText += itemText
                yield* emitSyntheticStreamEvent(
                  {
                    type: 'content_block_delta',
                    index: envelope.activeTextBlockIndex ?? 0,
                    delta: {
                      type: 'text_delta',
                      text: itemText,
                    },
                  },
                  envelope,
                  startTime,
                )
              }
              yield* flushSyntheticTextBlock(envelope, startTime)
            }
            break
          }
          case 'response.failed': {
            const message =
              event.response &&
              typeof event.response === 'object' &&
              typeof (event.response as { error?: { message?: unknown } }).error
                ?.message === 'string'
                ? ((event.response as { error: { message: string } }).error.message)
                : 'OpenAI/Codex backend returned response.failed'
            throw new Error(message)
          }
          case 'response.incomplete':
            throw new Error('OpenAI/Codex backend returned an incomplete response')
          default:
            break
        }
      }

      if (done) {
        break
      }
    }

    yield* flushSyntheticTextBlock(envelope, startTime)

    if (envelope.completedBlocks.length === 0) {
      throw new Error('OpenAI/Codex backend returned no assistant content')
    }

    if (!envelope.emittedMessageStart) {
      yield* ensureSyntheticMessageStart(envelope, startTime, params.options.model)
    }

    yield* emitSyntheticStreamEvent(
      {
        type: 'message_delta',
        delta: {
          stop_reason: stopReason,
          stop_sequence: null,
        },
        usage: { ...ZERO_USAGE },
      },
      envelope,
      startTime,
    )

    for (const message of envelope.emittedAssistantMessages) {
      message.message.stop_reason = stopReason
      message.message.usage = { ...ZERO_USAGE }
    }

    yield* emitSyntheticStreamEvent(
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
