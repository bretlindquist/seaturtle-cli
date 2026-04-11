import type { Message } from '../types/message.js'
import type { MidTurnSteeringIntent } from '../types/textInputTypes.js'
import {
  classifyCtConversationPosture,
  looksLikeExplicitWorkInvitation,
} from '../services/projectIdentity/conversationPosture.js'

const STOPWORDS = new Set([
  'about',
  'after',
  'also',
  'another',
  'around',
  'because',
  'before',
  'build',
  'change',
  'current',
  'different',
  'feature',
  'function',
  'great',
  'later',
  'make',
  'maybe',
  'please',
  'project',
  'really',
  'should',
  'something',
  'still',
  'that',
  'there',
  'these',
  'thing',
  'this',
  'turn',
  'update',
  'want',
  'with',
  'would',
])

const INTERRUPT_PATTERNS = [
  /^\s*(stop|cancel|abort|drop that|forget that)\b/i,
  /^\s*(wait|hold on)\b/i,
  /^\s*(actually|instead)\b.*\b(stop|cancel|switch|do this instead|forget)\b/i,
]

const PARK_PATTERNS = [
  /\b(later on|for later|park this|park that|come back to this)\b/i,
  /\b(unrelated|separate|something else|different function|different feature)\b/i,
  /\b(i have an idea|another idea|separate idea|unrelated idea)\b/i,
]

const QUESTION_PREFIX = /^(what|why|how|when|where|who|does|is|are|can|could|would|should)\b/i
const SAME_TASK_CONTINUATION = /\b(also|and|plus|for that|for this|on that|on this|it should|that should|this should|while you're in there)\b/i
const SAME_TASK_REFERENCE = /\b(it|that|this|same|current)\b/i

function referencesActiveTask(current: string, overlap: number): boolean {
  return (
    SAME_TASK_CONTINUATION.test(current) ||
    SAME_TASK_REFERENCE.test(current) ||
    overlap >= 2
  )
}

function extractInlineTextContent(
  blocks: readonly { readonly type: string }[],
  separator = '',
): string {
  return blocks
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map(block => block.text)
    .join(separator)
}

function getRecentUserTexts(messages: Message[]): string[] {
  const recent = messages.filter(
    message => message.type === 'user' && !message.isMeta,
  )

  return recent
    .slice(-4)
    .map(message => extractInlineTextContent(message.message.content, '\n'))
    .map(text => text.trim())
    .filter(Boolean)
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 4 && !STOPWORDS.has(token))
}

function countKeywordOverlap(currentInput: string, recentUserTexts: string[]): number {
  const currentTokens = new Set(tokenize(currentInput))
  if (currentTokens.size === 0) {
    return 0
  }

  const priorTokens = new Set(tokenize(recentUserTexts.join(' ')))
  let overlap = 0
  for (const token of currentTokens) {
    if (priorTokens.has(token)) {
      overlap++
    }
  }
  return overlap
}

export function classifyMidTurnSteering(input: {
  currentInput: string
  messages: Message[]
}): MidTurnSteeringIntent {
  const current = input.currentInput.trim()
  if (!current) {
    return 'same_task_steer'
  }

  if (INTERRUPT_PATTERNS.some(pattern => pattern.test(current))) {
    return 'interrupt_now'
  }

  if (PARK_PATTERNS.some(pattern => pattern.test(current))) {
    return 'park_for_later'
  }

  const recentUserTexts = getRecentUserTexts(input.messages)
  const overlap = countKeywordOverlap(current, recentUserTexts)
  const posture = classifyCtConversationPosture({
    currentInput: current,
    recentUserMessages: recentUserTexts,
  })
  const explicitWorkInvitation = looksLikeExplicitWorkInvitation(current)
  const activeTaskReference = referencesActiveTask(current, overlap)
  const questionWithoutTaskReference =
    QUESTION_PREFIX.test(current) &&
    !activeTaskReference &&
    !SAME_TASK_REFERENCE.test(current)

  if (questionWithoutTaskReference && posture === 'open') {
    return 'side_question'
  }

  if (activeTaskReference || explicitWorkInvitation || posture === 'work') {
    return 'same_task_steer'
  }

  if (questionWithoutTaskReference && posture === 'explore') {
    return explicitWorkInvitation ? 'same_task_steer' : 'side_question'
  }

  return 'park_for_later'
}
