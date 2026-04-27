import type {
  AssistantMessage,
  Message,
  UserMessage,
} from '../../types/message.js'
import type { GeminiReplayPolicy } from './geminiReplayPolicy.js'
import { DEFAULT_GEMINI_REPLAY_POLICY } from './geminiReplayPolicy.js'

type ToolUseBlock = {
  type: 'tool_use'
  id?: unknown
}

type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id?: unknown
}

function normalizeAssistantBlocks(message: AssistantMessage): Record<string, unknown>[] {
  const content = message.message.content
  if (!Array.isArray(content)) {
    return typeof content === 'string'
      ? [{ type: 'text', text: content }]
      : []
  }

  return content.filter(
    block => typeof block === 'object' && block !== null,
  ) as Record<string, unknown>[]
}

function normalizeUserBlocks(message: UserMessage): Record<string, unknown>[] {
  const content = message.message.content
  if (!Array.isArray(content)) {
    return typeof content === 'string'
      ? [{ type: 'text', text: content }]
      : []
  }

  return content.filter(
    block => typeof block === 'object' && block !== null,
  ) as Record<string, unknown>[]
}

function extractAssistantToolUseIds(message: AssistantMessage): string[] {
  return normalizeAssistantBlocks(message)
    .filter((block): block is ToolUseBlock => block.type === 'tool_use')
    .map(block => (typeof block.id === 'string' ? block.id : null))
    .filter((id): id is string => Boolean(id))
}

function extractToolResultIds(message: UserMessage): string[] {
  return normalizeUserBlocks(message)
    .filter((block): block is ToolResultBlock => block.type === 'tool_result')
    .map(block => (typeof block.tool_use_id === 'string' ? block.tool_use_id : null))
    .filter((id): id is string => Boolean(id))
}

function isToolResultOnlyUserMessage(message: UserMessage): boolean {
  const blocks = normalizeUserBlocks(message)
  return blocks.length > 0 && blocks.every(block => block.type === 'tool_result')
}

function findLatestVisibleGeminiUserTurnIndex(messages: Message[]): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (!message || message.type !== 'user') {
      continue
    }

    if (message.isMeta || message.isVisibleInTranscriptOnly) {
      continue
    }

    if (message.toolUseResult !== undefined) {
      continue
    }

    return index
  }

  return -1
}

function filterGeminiReplayMessages(
  messages: Message[],
  policy: GeminiReplayPolicy,
): Message[] {
  const latestVisibleUserTurnIndex = findLatestVisibleGeminiUserTurnIndex(messages)

  return messages.filter((message, index) => {
    if (message.type !== 'user') {
      return true
    }

    if (policy.dropTranscriptOnlyUserMessages && message.isVisibleInTranscriptOnly) {
      return false
    }

    if (
      policy.dropStaleMetaUserMessages &&
      message.isMeta &&
      latestVisibleUserTurnIndex !== -1 &&
      index < latestVisibleUserTurnIndex
    ) {
      return false
    }

    return true
  })
}

function mergeConsecutiveGeminiAssistantTurns(messages: Message[]): Message[] {
  const merged: Message[] = []

  for (const message of messages) {
    const previous = merged.at(-1)
    if (previous?.type !== 'assistant' || message.type !== 'assistant') {
      merged.push(message)
      continue
    }

    merged[merged.length - 1] = {
      ...message,
      message: {
        ...message.message,
        content: [
          ...normalizeAssistantBlocks(previous),
          ...normalizeAssistantBlocks(message),
        ],
      },
      timestamp: message.timestamp ?? previous.timestamp,
    }
  }

  return merged
}

function repairGeminiToolResultOrdering(messages: Message[]): Message[] {
  const repaired: Message[] = []
  const consumedToolResultIndexes = new Set<number>()
  const emittedToolResultIds = new Set<string>()

  for (let index = 0; index < messages.length; index++) {
    if (consumedToolResultIndexes.has(index)) {
      continue
    }

    const message = messages[index]

    if (message.type === 'assistant') {
      repaired.push(message)
      const toolUseIds = new Set(extractAssistantToolUseIds(message))
      if (toolUseIds.size === 0) {
        continue
      }

      const matchingResults: UserMessage[] = []
      for (let lookahead = index + 1; lookahead < messages.length; lookahead++) {
        const candidate = messages[lookahead]
        if (candidate.type === 'assistant') {
          break
        }
        if (candidate.type !== 'user' || !isToolResultOnlyUserMessage(candidate)) {
          continue
        }

        const toolResultIds = extractToolResultIds(candidate)
        if (toolResultIds.length === 0) {
          continue
        }

        const matchesCurrentAssistant = toolResultIds.every(id => toolUseIds.has(id))
        const isDuplicate = toolResultIds.some(id => emittedToolResultIds.has(id))
        if (!matchesCurrentAssistant || isDuplicate) {
          continue
        }

        toolResultIds.forEach(id => emittedToolResultIds.add(id))
        matchingResults.push(candidate)
        consumedToolResultIndexes.add(lookahead)
      }

      repaired.push(...matchingResults)
      continue
    }

    if (message.type === 'user' && isToolResultOnlyUserMessage(message)) {
      const toolResultIds = extractToolResultIds(message)
      const isDuplicate = toolResultIds.some(id => emittedToolResultIds.has(id))
      if (isDuplicate || toolResultIds.length > 0) {
        continue
      }
    }

    repaired.push(message)
  }

  return repaired
}

function applyGeminiAssistantFirstBootstrap(messages: Message[]): Message[] {
  if (messages[0]?.type !== 'assistant') {
    return messages
  }

  return [
    {
      type: 'user',
      uuid: 'gemini-session-bootstrap',
      timestamp: new Date().toISOString(),
      message: {
        role: 'user',
        content: '(session bootstrap)',
      },
    } as UserMessage,
    ...messages,
  ]
}

export function sanitizeGeminiReplayMessages(
  messages: Message[],
  policy: GeminiReplayPolicy = DEFAULT_GEMINI_REPLAY_POLICY,
): Message[] {
  let sanitized = filterGeminiReplayMessages(messages, policy)

  if (policy.repairToolResultOrdering || policy.dropOrphanToolResultMessages) {
    sanitized = repairGeminiToolResultOrdering(sanitized)
  }

  if (policy.mergeConsecutiveAssistantTurns) {
    sanitized = mergeConsecutiveGeminiAssistantTurns(sanitized)
  }

  if (policy.applyAssistantFirstBootstrap) {
    sanitized = applyGeminiAssistantFirstBootstrap(sanitized)
  }

  return sanitized
}
