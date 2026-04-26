#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { collectGeminiContents } from '../source/src/services/api/geminiContent.js'

function extractUserText(contents: ReturnType<typeof collectGeminiContents>['contents']): string[] {
  return contents
    .filter(content => content.role === 'user')
    .flatMap(content => content.parts)
    .flatMap(part => (typeof part.text === 'string' ? [part.text] : []))
}

const staleMetaReplay = collectGeminiContents({
  messages: [
    {
      type: 'user',
      message: { content: 'First request' },
    },
    {
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Working on the first request' }],
      },
    },
    {
      type: 'user',
      isMeta: true,
      message: { content: 'Old hidden repair objective' },
    },
    {
      type: 'user',
      message: { content: 'Second request' },
    },
    {
      type: 'user',
      isMeta: true,
      message: { content: 'Current-turn hidden scaffold' },
    },
  ] as never,
})

const staleMetaUserText = extractUserText(staleMetaReplay.contents)
assert.deepEqual(staleMetaUserText, [
  'First request',
  'Second request',
  'Current-turn hidden scaffold',
])
assert.ok(
  !staleMetaUserText.includes('Old hidden repair objective'),
  'expected stale hidden Gemini meta content to be dropped after a newer real user turn',
)

const activeMetaReplay = collectGeminiContents({
  messages: [
    {
      type: 'user',
      message: { content: 'Fix the current file' },
    },
    {
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'First attempt complete' }],
      },
    },
    {
      type: 'user',
      isMeta: true,
      message: { content: 'Repair only the latest issue' },
    },
  ] as never,
})

const activeMetaUserText = extractUserText(activeMetaReplay.contents)
assert.ok(
  activeMetaUserText.includes('Repair only the latest issue'),
  'expected current-turn hidden Gemini meta content to remain available',
)

console.log('gemini turn-boundary meta selftest passed')
