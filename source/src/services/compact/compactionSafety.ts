import type { Message } from '../../types/message.js'
import { createUserMessage } from '../../utils/messages.js'
import { tokenCountWithEstimation } from '../../utils/tokens.js'
import { groupMessagesByApiRound } from './grouping.js'

export const LARGE_SESSION_COMPACTION_MESSAGE_THRESHOLD = 1200
export const LARGE_SESSION_COMPACTION_TOKEN_THRESHOLD = 120_000
export const LARGE_SESSION_LEGACY_MAX_API_ROUNDS = 200
const LARGE_SESSION_COMPACTION_TRUNCATION_MARKER =
  '[earlier conversation omitted for large-session safety compaction]'

export type LargeSessionCompactionRisk =
  | {
      isLargeSession: false
      reason: 'normal'
      messageCount: number
      estimatedTokenCount: number
    }
  | {
      isLargeSession: true
      reason: 'message_count' | 'estimated_tokens'
      messageCount: number
      estimatedTokenCount: number
    }

export function classifyLargeSessionCompactionRisk(
  messages: Message[],
): LargeSessionCompactionRisk {
  const messageCount = messages.length
  const estimatedTokenCount = tokenCountWithEstimation(messages)

  if (messageCount >= LARGE_SESSION_COMPACTION_MESSAGE_THRESHOLD) {
    return {
      isLargeSession: true,
      reason: 'message_count',
      messageCount,
      estimatedTokenCount,
    }
  }

  if (estimatedTokenCount >= LARGE_SESSION_COMPACTION_TOKEN_THRESHOLD) {
    return {
      isLargeSession: true,
      reason: 'estimated_tokens',
      messageCount,
      estimatedTokenCount,
    }
  }

  return {
    isLargeSession: false,
    reason: 'normal',
    messageCount,
    estimatedTokenCount,
  }
}

export function projectLegacyCompactionMessages(messages: Message[]): {
  messages: Message[]
  wasTruncated: boolean
  risk: LargeSessionCompactionRisk
} {
  const risk = classifyLargeSessionCompactionRisk(messages)
  if (!risk.isLargeSession) {
    return { messages, wasTruncated: false, risk }
  }

  const groups = groupMessagesByApiRound(messages)
  if (groups.length <= LARGE_SESSION_LEGACY_MAX_API_ROUNDS) {
    return { messages, wasTruncated: false, risk }
  }

  const truncatedMessages = groups
    .slice(-LARGE_SESSION_LEGACY_MAX_API_ROUNDS)
    .flat()

  return {
    messages: [
      createUserMessage({
        content: LARGE_SESSION_COMPACTION_TRUNCATION_MARKER,
        isMeta: true,
      }),
      ...truncatedMessages,
    ],
    wasTruncated: true,
    risk,
  }
}
