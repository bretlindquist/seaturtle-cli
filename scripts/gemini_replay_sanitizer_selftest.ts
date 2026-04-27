#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { sanitizeGeminiReplayMessages } from '../source/src/services/api/geminiReplaySanitizer.js'

const sanitizedMeta = sanitizeGeminiReplayMessages([
  {
    type: 'user',
    isMeta: true,
    message: {
      role: 'user',
      content: 'resume old task',
    },
  },
  {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'old response' }],
    },
  },
  {
    type: 'user',
    isVisibleInTranscriptOnly: true,
    message: {
      role: 'user',
      content: 'transcript marker only',
    },
  },
  {
    type: 'user',
    message: {
      role: 'user',
      content: 'new real instruction',
    },
  },
] as never)

assert.equal(sanitizedMeta.length, 3)
assert.equal(sanitizedMeta[0]?.type, 'user')
assert.equal(
  (sanitizedMeta[0] as { message?: { content?: unknown } })?.message?.content,
  '(session bootstrap)',
)
assert.equal(sanitizedMeta[1]?.type, 'assistant')
assert.equal(
  (sanitizedMeta[2] as { message?: { content?: unknown } })?.message?.content,
  'new real instruction',
)

const bootstrapped = sanitizeGeminiReplayMessages([
  {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'starts with assistant' }],
    },
  },
] as never)

assert.equal(bootstrapped[0]?.type, 'user')
assert.equal(
  (bootstrapped[0] as { message?: { content?: unknown } }).message?.content,
  '(session bootstrap)',
)

const mergedAssistants = sanitizeGeminiReplayMessages([
  {
    type: 'user',
    message: {
      role: 'user',
      content: 'hello',
    },
  },
  {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'part one' }],
    },
  },
  {
    type: 'assistant',
    timestamp: '2026-04-27T00:00:00.000Z',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'part two' }],
    },
  },
] as never)

assert.equal(mergedAssistants.length, 2)
assert.equal(mergedAssistants[1]?.type, 'assistant')
assert.equal(
  Array.isArray((mergedAssistants[1] as { message?: { content?: unknown[] } }).message?.content),
  true,
)
assert.equal(
  ((mergedAssistants[1] as { message?: { content?: unknown[] } }).message?.content ?? []).length,
  2,
)

const repairedToolResults = sanitizeGeminiReplayMessages([
  {
    type: 'user',
    message: {
      role: 'user',
      content: 'use tool',
    },
  },
  {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
    },
  },
  {
    type: 'user',
    message: {
      role: 'user',
      content: 'fresh follow-up',
    },
  },
  {
    type: 'user',
    toolUseResult: { ok: true },
    message: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call_1',
          content: [{ type: 'text', text: 'done' }],
        },
      ],
    },
  },
  {
    type: 'user',
    toolUseResult: { ok: false },
    message: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'orphan_call',
          content: [{ type: 'text', text: 'orphan' }],
        },
      ],
    },
  },
] as never)

assert.equal(repairedToolResults.length, 4)
assert.equal(repairedToolResults[0]?.type, 'user')
assert.equal(repairedToolResults[1]?.type, 'assistant')
assert.equal(repairedToolResults[2]?.type, 'user')
assert.equal(
  ((repairedToolResults[2] as { message?: { content?: Array<{ type?: string }> } }).message?.content ?? [])[0]?.type,
  'tool_result',
)
assert.equal(
  (repairedToolResults[3] as { message?: { content?: unknown } }).message?.content,
  'fresh follow-up',
)

console.log('gemini-replay-sanitizer self-test passed')
