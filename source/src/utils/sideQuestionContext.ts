type SideQuestionContentBlock =
  | { type: string; id?: unknown; tool_use_id?: unknown }
  | string
  | null
  | undefined

type SideQuestionMessageLike = {
  type: string
  message?: {
    content?: SideQuestionContentBlock[]
  }
}

export const SIDE_QUESTION_MAX_CONTEXT_MESSAGES = 8

function getContentArray(
  message: SideQuestionMessageLike,
): SideQuestionContentBlock[] | null {
  return Array.isArray(message.message?.content) ? message.message.content : null
}

function getToolUseIds(messages: SideQuestionMessageLike[]): Set<string> {
  const ids = new Set<string>()

  for (const message of messages) {
    if (message.type !== 'assistant') continue
    const content = getContentArray(message)
    if (!content) continue

    for (const block of content) {
      if (
        typeof block === 'object' &&
        block !== null &&
        block.type === 'tool_use' &&
        typeof block.id === 'string'
      ) {
        ids.add(block.id)
      }
    }
  }

  return ids
}

function getToolResultIds(messages: SideQuestionMessageLike[]): Set<string> {
  const ids = new Set<string>()

  for (const message of messages) {
    if (message.type !== 'user') continue
    const content = getContentArray(message)
    if (!content) continue

    for (const block of content) {
      if (
        typeof block === 'object' &&
        block !== null &&
        block.type === 'tool_result' &&
        typeof block.tool_use_id === 'string'
      ) {
        ids.add(block.tool_use_id)
      }
    }
  }

  return ids
}

export function repairSideQuestionContext<T extends SideQuestionMessageLike>(
  messages: T[],
): T[] {
  // /btw intentionally forks only a short tail of the transcript. That slice
  // can drop either side of a tool_use/tool_result pair. Strip incomplete tool
  // traffic so the side-question fork stays structurally valid for provider
  // runtimes like OpenAI/Codex.
  const toolUseIds = getToolUseIds(messages)
  const toolResultIds = getToolResultIds(messages)

  return messages.flatMap(message => {
    const content = getContentArray(message)
    if (!content) {
      return [message]
    }

    if (message.type === 'assistant') {
      const filtered = content.filter(block => {
        if (
          typeof block === 'object' &&
          block !== null &&
          block.type === 'tool_use' &&
          typeof block.id === 'string'
        ) {
          return toolResultIds.has(block.id)
        }
        return true
      })

      if (filtered.length === 0) {
        return []
      }

      if (filtered.length === content.length) {
        return [message]
      }

      return [{ ...message, message: { ...message.message, content: filtered } }]
    }

    if (message.type === 'user') {
      const filtered = content.filter(block => {
        if (
          typeof block === 'object' &&
          block !== null &&
          block.type === 'tool_result' &&
          typeof block.tool_use_id === 'string'
        ) {
          return toolUseIds.has(block.tool_use_id)
        }
        return true
      })

      if (filtered.length === 0) {
        return []
      }

      if (filtered.length === content.length) {
        return [message]
      }

      return [{ ...message, message: { ...message.message, content: filtered } }]
    }

    return [message]
  })
}

export function selectSideQuestionContext<T extends SideQuestionMessageLike>(
  messages: T[],
): T[] {
  const relevant = messages.filter(
    message =>
      message.type === 'user' ||
      message.type === 'assistant' ||
      message.type === 'attachment',
  )

  return repairSideQuestionContext(
    relevant.slice(-SIDE_QUESTION_MAX_CONTEXT_MESSAGES),
  )
}
