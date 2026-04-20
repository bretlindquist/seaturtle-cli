import type {
  BetaContentBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import {
  normalizeOpenAiToolParameterSchema,
} from './openaiToolSchema.js'
import { runGeminiGenerateContent } from './geminiClient.js'
import type {
  GeminiContent,
  GeminiGenerateContentResponse,
  GeminiPart,
  GeminiTool,
} from './geminiTypes.js'
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

function buildInstructions(systemPrompt: SystemPrompt): string {
  return systemPrompt.filter(Boolean).join('\n\n')
}

function convertUserContentPart(block: Record<string, unknown>): GeminiPart | null {
  const type = block.type
  if (
    typeof block.text === 'string' &&
    (type === 'text' || type === 'input_text')
  ) {
    return { text: block.text }
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
    inlineData: {
      mimeType: mediaType,
      data,
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

function convertMessage(message: UserMessage | AssistantMessage): GeminiContent[] {
  const role = message.type === 'assistant' ? 'assistant' : 'user'
  const contentBlocks = Array.isArray(message.message.content)
    ? message.message.content
    : [{ type: 'text', text: message.message.content }]

  if (role === 'assistant') {
    const parts: GeminiPart[] = []

    for (const block of contentBlocks) {
      if (!block || typeof block !== 'object') {
        continue
      }
      const type = (block as { type?: unknown }).type
      if (type === 'text' && typeof (block as { text?: unknown }).text === 'string') {
        parts.push({ text: (block as { text: string }).text })
      } else if (type === 'tool_use') {
        const id =
          typeof (block as { id?: unknown }).id === 'string'
            ? (block as { id: string }).id
            : 'missing_tool_id'
        const name =
          typeof (block as { name?: unknown }).name === 'string'
            ? (block as { name: string }).name
            : 'unknown_tool'
        parts.push({
          functionCall: {
            id,
            name,
            args:
              typeof (block as { input?: unknown }).input === 'object' &&
              (block as { input?: unknown }).input !== null
                ? ((block as { input: Record<string, unknown> }).input)
                : {},
          },
        })
      }
    }

    if (parts.length === 0) {
      return []
    }

    return [
      {
        role: 'model',
        parts,
      },
    ]
  }

  const converted: GeminiPart[] = []
  const toolContents: GeminiContent[] = []

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
      toolContents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: toolCallId,
              // Wave 4 will preserve the original function name; this transitional
              // native transport keeps the response tied to the function-call id.
              name: toolCallId,
              response: {
                content: convertToolResultContent(
                  (block as { content?: unknown }).content,
                ),
              },
            },
          },
        ],
      })
      continue
    }

    const part = convertUserContentPart(block as Record<string, unknown>)
    if (part) {
      converted.push(part)
    }
  }

  const messages: GeminiContent[] = []
  if (converted.length > 0) {
    messages.push({ role: 'user', parts: converted })
  }
  messages.push(...toolContents)
  return messages
}

function buildGeminiSystemInstruction(
  systemPrompt: SystemPrompt,
): GeminiContent | undefined {
  const instructions = buildInstructions(systemPrompt)
  return instructions ? { parts: [{ text: instructions }] } : undefined
}

function collectGeminiContents(params: {
  messages: Message[]
}): GeminiContent[] {
  const contents: GeminiContent[] = []
  for (const message of params.messages) {
    if (message.type !== 'user' && message.type !== 'assistant') {
      continue
    }
    contents.push(...convertMessage(message))
  }

  return contents
}

async function buildGeminiTools(params: {
  tools: Tools
}): Promise<GeminiTool[]> {
  const functionDeclarations: NonNullable<GeminiTool['functionDeclarations']> = []

  for (const tool of params.tools) {
    if (typeof tool.name !== 'string' || !tool.name) {
      continue
    }

    const schema =
      'inputJSONSchema' in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : zodToJsonSchema(tool.inputSchema)
    const parameters = normalizeOpenAiToolParameterSchema(schema ?? {})

    functionDeclarations.push({
      name: tool.name,
      description: tool.description,
      parameters,
    })
  }

  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : []
}

function parseAssistantContent(response: GeminiGenerateContentResponse): BetaContentBlock[] {
  const parts = response.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) {
    return []
  }

  const content: BetaContentBlock[] = []
  for (const part of parts) {
    if (typeof part.text === 'string' && part.text.length > 0) {
      content.push({
        type: 'text',
        text: part.text,
      } as BetaContentBlock)
    }
    if (part.functionCall) {
      content.push({
        type: 'tool_use',
        id:
          typeof part.functionCall.id === 'string'
            ? part.functionCall.id
            : 'missing_tool_id',
        name: part.functionCall.name,
        input: part.functionCall.args ?? {},
      } as BetaContentBlock)
    }
  }

  return content
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

  const contents = collectGeminiContents({
    messages: params.messages,
  })
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
