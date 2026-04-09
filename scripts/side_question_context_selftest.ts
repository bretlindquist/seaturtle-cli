import assert from 'node:assert/strict'

import {
  repairSideQuestionContext,
  selectSideQuestionContext,
  SIDE_QUESTION_MAX_CONTEXT_MESSAGES,
} from '../source/src/utils/sideQuestionContext.ts'

function getToolUseIds(messages: Array<{ type: string; message?: { content: unknown[] } }>): Set<string> {
  const ids = new Set<string>()
  for (const message of messages) {
    if (message.type !== 'assistant' || !Array.isArray(message.message?.content)) {
      continue
    }
    for (const block of message.message.content) {
      if (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        'id' in block &&
        block.type === 'tool_use' &&
        typeof block.id === 'string'
      ) {
        ids.add(block.id)
      }
    }
  }
  return ids
}

function getToolResultIds(messages: Array<{ type: string; message?: { content: unknown[] } }>): string[] {
  const ids: string[] = []
  for (const message of messages) {
    if (message.type !== 'user' || !Array.isArray(message.message?.content)) {
      continue
    }
    for (const block of message.message.content) {
      if (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        'tool_use_id' in block &&
        block.type === 'tool_result' &&
        typeof block.tool_use_id === 'string'
      ) {
        ids.push(block.tool_use_id)
      }
    }
  }
  return ids
}

const orphanedSlice = [
  {
    type: 'user',
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call-side-question',
          content: 'tool output',
        },
      ],
    },
  },
  {
    type: 'assistant',
    message: {
      content: [{ type: 'text', text: 'recent assistant context' }],
    },
  },
  {
    type: 'user',
    message: {
      content: [{ type: 'text', text: 'recent user context' }],
    },
  },
]

const repairedOrphanedSlice = repairSideQuestionContext(orphanedSlice)
assert.deepEqual(
  getToolResultIds(repairedOrphanedSlice),
  [],
  'repairSideQuestionContext should strip orphaned tool_result blocks from /btw context',
)

const unresolvedToolUseSlice = [
  {
    type: 'assistant',
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'call-unresolved',
          name: 'Read',
          input: { file_path: 'README.md' },
        },
      ],
    },
  },
  {
    type: 'user',
    message: {
      content: [{ type: 'text', text: 'recent user context' }],
    },
  },
]

const repairedUnresolvedToolUseSlice =
  repairSideQuestionContext(unresolvedToolUseSlice)
assert.deepEqual(
  [...getToolUseIds(repairedUnresolvedToolUseSlice)],
  [],
  'repairSideQuestionContext should strip tool_use blocks that no longer have matching results',
)

const intactPair = [
  {
    type: 'assistant',
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'call-valid-pair',
          name: 'Read',
          input: { file_path: 'README.md' },
        },
      ],
    },
  },
  {
    type: 'user',
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call-valid-pair',
          content: 'README contents',
        },
      ],
    },
  },
]

const repairedIntactPair = repairSideQuestionContext(intactPair)
assert.deepEqual(
  [...getToolUseIds(repairedIntactPair)],
  ['call-valid-pair'],
  'repairSideQuestionContext should preserve matching tool_use blocks',
)
assert.deepEqual(
  getToolResultIds(repairedIntactPair),
  ['call-valid-pair'],
  'repairSideQuestionContext should preserve matching tool_result blocks',
)

const oversizedMixedContext = [
  { type: 'system', message: { content: [{ type: 'text', text: 'ignore me' }] } },
  { type: 'attachment', attachment: { type: 'file', path: 'a.txt' } },
  ...Array.from({ length: SIDE_QUESTION_MAX_CONTEXT_MESSAGES + 2 }, (_, index) => ({
    type: index % 2 === 0 ? 'assistant' : 'user',
    message: {
      content: [{ type: 'text', text: `msg-${index}` }],
    },
  })),
]

const selectedContext = selectSideQuestionContext(oversizedMixedContext)
assert.equal(
  selectedContext.length,
  SIDE_QUESTION_MAX_CONTEXT_MESSAGES,
  'selectSideQuestionContext should cap /btw context length to the configured tail size',
)
assert(
  selectedContext.every(
    message =>
      message.type === 'assistant' ||
      message.type === 'user' ||
      message.type === 'attachment',
  ),
  'selectSideQuestionContext should exclude non-transcript message types from /btw context',
)
assert.deepEqual(
  selectedContext.map(message =>
    message.type === 'attachment'
      ? 'attachment'
      : (message.message?.content?.[0] as { text?: string } | undefined)?.text,
  ),
  ['msg-2', 'msg-3', 'msg-4', 'msg-5', 'msg-6', 'msg-7', 'msg-8', 'msg-9'],
  'selectSideQuestionContext should keep the latest relevant transcript tail',
)

console.log('side-question context self-test passed')
