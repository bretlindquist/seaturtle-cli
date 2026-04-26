import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Message, UserMessage } from '../types/message.js'

export const RETAINED_MULTIMODAL_PLACEHOLDER_DATA =
  '__SEATURTLE_RETAINED_MULTIMODAL_OMITTED__'

export const HISTORICAL_MULTIMODAL_MESSAGE_RETENTION_COUNT = 2

function getBase64Source(
  block: ContentBlockParam,
): Record<string, unknown> | null {
  const source =
    'source' in block && typeof block.source === 'object' && block.source !== null
      ? (block.source as Record<string, unknown>)
      : null
  return source?.type === 'base64' ? source : null
}

export function isRetainedMultimodalPlaceholderData(data: unknown): boolean {
  return data === RETAINED_MULTIMODAL_PLACEHOLDER_DATA
}

export function hasRetainedUserMultimodalPayload(
  content: string | ContentBlockParam[],
): boolean {
  if (!Array.isArray(content)) {
    return false
  }

  return content.some(block => {
    if (block.type !== 'image' && block.type !== 'document') {
      return false
    }
    const source = getBase64Source(block)
    if (!source) {
      return false
    }
    const data = source.data
    return (
      typeof data === 'string' &&
      data.length > 0 &&
      !isRetainedMultimodalPlaceholderData(data)
    )
  })
}

export function sanitizeStoredUserMultimodalMessage(
  message: UserMessage,
): UserMessage {
  const content = message.message.content
  if (!Array.isArray(content) || !hasRetainedUserMultimodalPayload(content)) {
    return message
  }

  let changed = false
  const sanitized = content.map(block => {
    if (block.type === 'image') {
      const source = getBase64Source(block)
      if (!source) {
        return block
      }
      const data = source.data
      if (
        typeof data !== 'string' ||
        data.length === 0 ||
        isRetainedMultimodalPlaceholderData(data)
      ) {
        return block
      }
      changed = true
      return {
        ...block,
        source: {
          ...block.source,
          data: RETAINED_MULTIMODAL_PLACEHOLDER_DATA,
        },
      }
    }

    if (block.type === 'document') {
      const source = getBase64Source(block)
      if (!source) {
        return block
      }
      const data = source.data
      if (
        typeof data !== 'string' ||
        data.length === 0 ||
        isRetainedMultimodalPlaceholderData(data)
      ) {
        return block
      }
      changed = true
      const filename =
        typeof block.filename === 'string' && block.filename.trim().length > 0
          ? `: ${block.filename.trim()}`
          : ''
      return {
        type: 'text' as const,
        text: `[Document omitted from retained context${filename}]`,
      }
    }

    return block
  })

  if (!changed) {
    return message
  }

  return {
    ...message,
    message: {
      ...message.message,
      content: sanitized,
    },
  }
}

export function stripRetainedMultimodalPlaceholdersFromUserMessage(
  message: UserMessage,
): UserMessage {
  const content = message.message.content
  if (!Array.isArray(content)) {
    return message
  }

  let changed = false
  const filtered = content.filter(block => {
    if (block.type !== 'image' && block.type !== 'document') {
      return true
    }
    const source = getBase64Source(block)
    if (!source) {
      return true
    }
    if (isRetainedMultimodalPlaceholderData(source.data)) {
      changed = true
      return false
    }
    return true
  })

  if (!changed) {
    return message
  }

  return {
    ...message,
    message: {
      ...message.message,
      content:
        filtered.length > 0
          ? filtered
          : [
              {
                type: 'text' as const,
                text: '[Earlier multimodal attachment omitted from retained context]',
              },
            ],
    },
  }
}

export function pruneHistoricalUserMultimodalMessages(
  messages: Message[],
  keepRecentCount: number = HISTORICAL_MULTIMODAL_MESSAGE_RETENTION_COUNT,
): Message[] {
  const multimodalIndexes: number[] = []
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index]
    if (
      message?.type === 'user' &&
      hasRetainedUserMultimodalPayload(message.message.content)
    ) {
      multimodalIndexes.push(index)
    }
  }

  if (multimodalIndexes.length <= keepRecentCount) {
    return messages
  }

  const keep = new Set(multimodalIndexes.slice(-keepRecentCount))
  let changed = false
  const nextMessages = messages.map((message, index) => {
    if (message.type !== 'user' || keep.has(index)) {
      return message
    }
    const sanitized = sanitizeStoredUserMultimodalMessage(message)
    if (sanitized !== message) {
      changed = true
    }
    return sanitized
  })

  return changed ? nextMessages : messages
}
