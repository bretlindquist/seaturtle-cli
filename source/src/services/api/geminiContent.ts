import type {
  BetaContentBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { buildGeminiFunctionDeclaration } from './geminiToolSchema.js'
import type {
  GeminiContent,
  GeminiGenerateContentResponse,
  GeminiPart,
  GeminiTool,
} from './geminiTypes.js'
import {
  getGeminiFunctionName,
  getGeminiThoughtSignature,
  requiresGeminiThoughtSignature,
  withGeminiProviderBlockMetadata,
} from './geminiThoughtSignatures.js'
import type {
  AssistantMessage,
  Message,
  UserMessage,
} from '../../types/message.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import type { Tools } from '../../Tool.js'
import { zodToJsonSchema } from '../../utils/zodToJsonSchema.js'

type ToolUseNameMap = Map<string, string>

export type GeminiContentConversion = {
  contents: GeminiContent[]
  validationError?: string
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

function convertAssistantMessage(
  message: AssistantMessage,
  toolUseNamesById: ToolUseNameMap,
): GeminiContentConversion {
  const contentBlocks = Array.isArray(message.message.content)
    ? message.message.content
    : [{ type: 'text', text: message.message.content }]
  const parts: GeminiPart[] = []

  for (const block of contentBlocks) {
    if (!block || typeof block !== 'object') {
      continue
    }
    const type = (block as { type?: unknown }).type
    const thoughtSignature = getGeminiThoughtSignature(block)

    if (type === 'text' && typeof (block as { text?: unknown }).text === 'string') {
      parts.push({
        text: (block as { text: string }).text,
        ...(thoughtSignature ? { thoughtSignature } : {}),
      })
      continue
    }

    if (type !== 'tool_use') {
      continue
    }

    const id =
      typeof (block as { id?: unknown }).id === 'string'
        ? (block as { id: string }).id
        : 'missing_tool_id'
    const name =
      typeof (block as { name?: unknown }).name === 'string'
        ? (block as { name: string }).name
        : 'unknown_tool'

    toolUseNamesById.set(id, name)

    if (requiresGeminiThoughtSignature(block) && !thoughtSignature) {
      return {
        contents: [],
        validationError:
          `Gemini tool call ${id} is missing its thought signature. ` +
          'Replay cannot continue safely because Gemini requires hidden thought signatures for multi-turn function-calling context.',
      }
    }

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
      ...(thoughtSignature ? { thoughtSignature } : {}),
    })
  }

  return parts.length > 0
    ? {
        contents: [
          {
            role: 'model',
            parts,
          },
        ],
      }
    : { contents: [] }
}

function convertUserMessage(
  message: UserMessage,
  toolUseNamesById: ToolUseNameMap,
): GeminiContent[] {
  const contentBlocks = Array.isArray(message.message.content)
    ? message.message.content
    : [{ type: 'text', text: message.message.content }]
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
      const functionName =
        toolUseNamesById.get(toolCallId) ??
        getGeminiFunctionName(block) ??
        toolCallId

      toolContents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: toolCallId,
              name: functionName,
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

export function buildGeminiSystemInstruction(
  systemPrompt: SystemPrompt,
): GeminiContent | undefined {
  const instructions = buildInstructions(systemPrompt)
  return instructions ? { parts: [{ text: instructions }] } : undefined
}

export function collectGeminiContents(params: {
  messages: Message[]
}): GeminiContentConversion {
  const contents: GeminiContent[] = []
  const toolUseNamesById: ToolUseNameMap = new Map()

  for (const message of params.messages) {
    if (message.type === 'assistant') {
      const converted = convertAssistantMessage(message, toolUseNamesById)
      if (converted.validationError) {
        return converted
      }
      contents.push(...converted.contents)
      continue
    }

    if (message.type === 'user') {
      contents.push(...convertUserMessage(message, toolUseNamesById))
    }
  }

  return { contents }
}

export async function buildGeminiTools(params: {
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
    functionDeclarations.push(buildGeminiFunctionDeclaration({
      name: tool.name,
      description: tool.description,
      parameters: schema ?? {},
    }))
  }

  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : []
}

function attachGeminiMetadata(
  block: Record<string, unknown>,
  part: GeminiPart,
  functionName?: string,
): BetaContentBlock {
  if (!part.thoughtSignature && !functionName) {
    return block as BetaContentBlock
  }

  return withGeminiProviderBlockMetadata(block, {
    ...(part.thoughtSignature
      ? {
          thoughtSignature: part.thoughtSignature,
          requiresThoughtSignature: true,
        }
      : {}),
    ...(functionName ? { functionName } : {}),
  }) as BetaContentBlock
}

export function parseGeminiAssistantContent(
  response: GeminiGenerateContentResponse,
): BetaContentBlock[] {
  const parts = response.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) {
    return []
  }

  const content: BetaContentBlock[] = []
  for (const [index, part] of parts.entries()) {
    if (typeof part.text === 'string' && part.text.length > 0) {
      content.push(
        attachGeminiMetadata(
          {
            type: 'text',
            text: part.text,
          },
          part,
        ),
      )
      continue
    }

    if (part.functionCall) {
      const id =
        typeof part.functionCall.id === 'string' && part.functionCall.id
          ? part.functionCall.id
          : `gemini_call_${index}`
      const name = part.functionCall.name
      content.push(
        attachGeminiMetadata(
          {
            type: 'tool_use',
            id,
            name,
            input: part.functionCall.args ?? {},
          },
          part,
          name,
        ),
      )
      continue
    }

    if (part.inlineData) {
      content.push(
        attachGeminiMetadata(
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: part.inlineData.mimeType,
              data: part.inlineData.data,
            },
          },
          part,
        ),
      )
      continue
    }

    if (part.executableCode) {
      const language = part.executableCode.language ?? 'text'
      content.push(
        attachGeminiMetadata(
          {
            type: 'text',
            text: `Gemini executable code (${language}):\n${part.executableCode.code ?? ''}`,
          },
          part,
        ),
      )
      continue
    }

    if (part.codeExecutionResult) {
      content.push(
        attachGeminiMetadata(
          {
            type: 'text',
            text:
              `Gemini code execution result (${part.codeExecutionResult.outcome ?? 'unknown'}):\n` +
              `${part.codeExecutionResult.output ?? ''}`,
          },
          part,
        ),
      )
    }
  }

  return content
}
