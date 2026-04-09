import assert from 'node:assert/strict'

import { repairSideQuestionContext } from '../source/src/utils/sideQuestionContext.ts'

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

console.log('side-question context self-test passed')
