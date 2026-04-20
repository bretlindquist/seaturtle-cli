import type {
  BetaContentBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import {
  normalizeOpenAiToolParameterSchema,
  shouldUseStrictOpenAiToolSchema,
} from './openaiToolSchema.js'
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
import type { Tools } from '../../Tool.js'
import { zodToJsonSchema } from '../../utils/zodToJsonSchema.js'
import type { Options } from './claude.js'
import { getDefaultGeminiApiKeyProfile } from '../authProfiles/store.js'

export type GeminiModelDefinition = {
  value: string
  label: string
  description: string
  descriptionForModel: string
}

export type GeminiModelCapabilities = {
  supportsFunctionCalling: boolean
  supportsMultimodalInput: boolean
  supportsDocuments: boolean
  supportsWebSearch: boolean
  supportsFileSearch: boolean
  supportsRemoteMcp: boolean
  supportsHostedShell: boolean
  supportsComputerUse: boolean
  supportsImageGeneration: boolean
}

export const GEMINI_MODEL_DEFINITIONS: readonly GeminiModelDefinition[] = [
  {
    value: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    description: 'Frontier-class Gemini model for fast agentic work',
    descriptionForModel:
      'Gemini 3 Flash Preview - frontier-class Gemini model for fast agentic work',
  },
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Advanced Gemini model for complex reasoning and coding',
    descriptionForModel:
      'Gemini 2.5 Pro - advanced Gemini model for complex reasoning and coding',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Best price-performance Gemini model for low-latency work',
    descriptionForModel:
      'Gemini 2.5 Flash - best price-performance Gemini model for low-latency work',
  },
  {
    value: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Fastest and most budget-friendly Gemini 2.5 model',
    descriptionForModel:
      'Gemini 2.5 Flash-Lite - fastest and most budget-friendly Gemini 2.5 model',
  },
] as const

const KNOWN_GEMINI_MODELS = new Set(
  GEMINI_MODEL_DEFINITIONS.map(model => model.value),
)

const ROUTED_GEMINI_MODEL_CAPABILITIES: GeminiModelCapabilities = {
  supportsFunctionCalling: true,
  supportsMultimodalInput: true,
  supportsDocuments: false,
  supportsWebSearch: false,
  supportsFileSearch: false,
  supportsRemoteMcp: false,
  supportsHostedShell: false,
  supportsComputerUse: false,
  supportsImageGeneration: false,
}

type GeminiChatMessage =
  | {
      role: 'system' | 'user'
      content: string | GeminiChatContentPart[]
    }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: GeminiChatToolCall[]
    }
  | {
      role: 'tool'
      tool_call_id: string
      content: string
    }

type GeminiChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type GeminiChatTool = {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: unknown
    strict?: boolean
  }
}

type GeminiChatToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

type GeminiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown
      tool_calls?: unknown
    }
  }>
  error?: {
    message?: string
  }
}

type GeminiAuthTarget = {
  baseUrl: string
  apiKey: string
  source: string
}

export function getGeminiModelDefinitions(): readonly GeminiModelDefinition[] {
  return GEMINI_MODEL_DEFINITIONS
}

export function getDocumentedGeminiModelCapabilities(
  model: string,
): GeminiModelCapabilities {
  return KNOWN_GEMINI_MODELS.has(model)
    ? ROUTED_GEMINI_MODEL_CAPABILITIES
    : {
        ...ROUTED_GEMINI_MODEL_CAPABILITIES,
        supportsFunctionCalling: false,
        supportsMultimodalInput: false,
      }
}

export function getRoutedGeminiModelCapabilities(
  model: string,
): GeminiModelCapabilities {
  return getDocumentedGeminiModelCapabilities(model)
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
          : 'https://generativelanguage.googleapis.com/v1beta/openai',
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
      process.env.GEMINI_OPENAI_BASE_URL?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/openai',
    source: 'GEMINI_API_KEY',
  }
}

export function validateGeminiModel(model: string): string | null {
  return KNOWN_GEMINI_MODELS.has(model)
    ? null
    : `model \`${model}\` is not available through the Gemini runtime in this build. Supported models: ${GEMINI_MODEL_DEFINITIONS.map(item => `\`${item.value}\``).join(', ')}.`
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function buildGeminiChatCompletionsEndpoint(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`
}

function buildInstructions(systemPrompt: SystemPrompt): string {
  return systemPrompt.filter(Boolean).join('\n\n')
}

function buildDataUrl(mediaType: string, data: string): string {
  return `data:${mediaType};base64,${data}`
}

function convertUserContentPart(block: Record<string, unknown>):
  | GeminiChatContentPart
  | null {
  const type = block.type
  if (
    typeof block.text === 'string' &&
    (type === 'text' || type === 'input_text')
  ) {
    return { type: 'text', text: block.text }
  }

  const source =
    typeof block.source === 'object' && block.source !== null
      ? (block.source as Record<string, unknown>)
      : null
  if (type !== 'image' || source?.type !== 'base64') {
    return null
  }

  const mediaType =
    typeof source.media_type === 'string' ? source.media_type : null
  const data = typeof source.data === 'string' ? source.data : null
  if (!mediaType || !data) {
    return null
  }

  return {
    type: 'image_url',
    image_url: {
      url: buildDataUrl(mediaType, data),
    },
  }
}

function convertToolResultContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map(part => {
      if (!part || typeof part !== 'object') {
        return ''
      }
      if (typeof (part as { text?: unknown }).text === 'string') {
        return (part as { text: string }).text
      }
      return JSON.stringify(part)
    })
    .filter(Boolean)
    .join('\n')
}

function convertMessage(message: UserMessage | AssistantMessage): GeminiChatMessage[] {
  const role = message.type === 'assistant' ? 'assistant' : 'user'
  const contentBlocks = Array.isArray(message.message.content)
    ? message.message.content
    : [{ type: 'text', text: message.message.content }]

  if (role === 'assistant') {
    const textParts: string[] = []
    const toolCalls: GeminiChatToolCall[] = []

    for (const block of contentBlocks) {
      if (!block || typeof block !== 'object') {
        continue
      }
      const type = (block as { type?: unknown }).type
      if (type === 'text' && typeof (block as { text?: unknown }).text === 'string') {
        textParts.push((block as { text: string }).text)
      } else if (type === 'tool_use') {
        const id =
          typeof (block as { id?: unknown }).id === 'string'
            ? (block as { id: string }).id
            : 'missing_tool_id'
        const name =
          typeof (block as { name?: unknown }).name === 'string'
            ? (block as { name: string }).name
            : 'unknown_tool'
        toolCalls.push({
          id,
          type: 'function',
          function: {
            name,
            arguments: JSON.stringify(
              typeof (block as { input?: unknown }).input === 'object' &&
                (block as { input?: unknown }).input !== null
                ? (block as { input: unknown }).input
                : {},
            ),
          },
        })
      }
    }

    if (textParts.length === 0 && toolCalls.length === 0) {
      return []
    }

    return [
      {
        role: 'assistant',
        content: textParts.join('\n\n') || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      },
    ]
  }

  const converted: GeminiChatContentPart[] = []
  const toolMessages: GeminiChatMessage[] = []

  for (const block of contentBlocks) {
    if (!block || typeof block !== 'object') {
      continue
    }

    const type = (block as { type?: unknown }).type
    if (type === 'tool_result') {
      const toolCallId =
        typeof (block as { tool_use_id?: unknown }).tool_use_id === 'string'
          ? (block as { tool_use_id: string }).tool_use_id
          : 'missing_tool_result_id'
      toolMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: convertToolResultContent((block as { content?: unknown }).content),
      })
      continue
    }

    const part = convertUserContentPart(block as Record<string, unknown>)
    if (part) {
      converted.push(part)
    }
  }

  const messages: GeminiChatMessage[] = []
  if (converted.length === 1 && converted[0]?.type === 'text') {
    messages.push({ role: 'user', content: converted[0].text })
  } else if (converted.length > 0) {
    messages.push({ role: 'user', content: converted })
  }
  messages.push(...toolMessages)
  return messages
}

function collectGeminiChatMessages(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
}): GeminiChatMessage[] {
  const messages: GeminiChatMessage[] = []
  const instructions = buildInstructions(params.systemPrompt)
  if (instructions) {
    messages.push({ role: 'system', content: instructions })
  }

  for (const message of params.messages) {
    if (message.type !== 'user' && message.type !== 'assistant') {
      continue
    }
    messages.push(...convertMessage(message))
  }

  return messages
}

async function buildGeminiTools(params: {
  tools: Tools
}): Promise<GeminiChatTool[]> {
  const convertedTools: GeminiChatTool[] = []

  for (const tool of params.tools) {
    if (typeof tool.name !== 'string' || !tool.name) {
      continue
    }

    const schema =
      'inputJSONSchema' in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : zodToJsonSchema(tool.inputSchema)
    const parameters = normalizeOpenAiToolParameterSchema(schema ?? {})

    convertedTools.push({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters,
        ...(shouldUseStrictOpenAiToolSchema(tool.name) ? { strict: true } : {}),
      },
    })
  }

  return convertedTools
}

function parseToolCallInput(raw: string): unknown {
  if (!raw.trim()) {
    return {}
  }

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function parseAssistantContent(response: GeminiChatCompletionResponse): BetaContentBlock[] {
  const message = response.choices?.[0]?.message
  if (!message) {
    return []
  }

  const content: BetaContentBlock[] = []
  if (typeof message.content === 'string' && message.content.length > 0) {
    content.push({
      type: 'text',
      text: message.content,
    } as BetaContentBlock)
  }

  if (Array.isArray(message.tool_calls)) {
    for (const rawToolCall of message.tool_calls) {
      if (!rawToolCall || typeof rawToolCall !== 'object') {
        continue
      }
      const toolCall = rawToolCall as {
        id?: unknown
        function?: {
          name?: unknown
          arguments?: unknown
        }
      }
      content.push({
        type: 'tool_use',
        id: typeof toolCall.id === 'string' ? toolCall.id : 'missing_tool_id',
        name:
          typeof toolCall.function?.name === 'string'
            ? toolCall.function.name
            : 'unknown_tool',
        input:
          typeof toolCall.function?.arguments === 'string'
            ? parseToolCallInput(toolCall.function.arguments)
            : {},
      } as BetaContentBlock)
    }
  }

  return content
}

function formatGeminiHttpError(params: {
  status: number
  statusText: string
  body: string
}): string {
  try {
    const parsed = JSON.parse(params.body) as GeminiChatCompletionResponse
    const message = parsed.error?.message
    if (typeof message === 'string' && message.trim()) {
      return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText} · ${message.trim()}`
    }
  } catch {
    // Fall through to raw body.
  }

  return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText}${params.body ? ` · ${params.body}` : ''}`
}

function buildGeminiReasoningEffort(options: Options):
  | 'low'
  | 'medium'
  | 'high'
  | undefined {
  const effort = resolveGeminiEffort(options)
  return effort === 'xhigh' ? 'high' : effort
}

function resolveGeminiEffort(options: Options): Options['effortValue'] {
  return options.effortValue
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
        'Gemini auth is not configured. Set GEMINI_API_KEY, then retry with `CLAUDE_CODE_MAIN_PROVIDER=gemini`.',
    })
  }

  const modelError = validateGeminiModel(params.model)
  if (modelError) {
    return createAssistantAPIErrorMessage({ content: modelError })
  }

  const messages = collectGeminiChatMessages({
    messages: params.messages,
    systemPrompt: params.systemPrompt,
  })
  if (messages.length === 0) {
    return createAssistantAPIErrorMessage({
      content: 'Gemini request is missing input messages.',
    })
  }

  const tools = await buildGeminiTools({ tools: params.tools })
  const reasoningEffort = buildGeminiReasoningEffort(params.options)

  try {
    const response = await fetch(buildGeminiChatCompletionsEndpoint(auth.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${auth.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages,
        ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        ...(params.options.maxOutputTokensOverride
          ? { max_completion_tokens: params.options.maxOutputTokensOverride }
          : {}),
        stream: false,
      }),
      signal: params.signal,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        formatGeminiHttpError({
          status: response.status,
          statusText: response.statusText,
          body,
        }),
      )
    }

    const payload = (await response.json()) as GeminiChatCompletionResponse
    const content = parseAssistantContent(payload)
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
