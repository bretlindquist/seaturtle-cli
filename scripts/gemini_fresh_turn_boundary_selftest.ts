#!/usr/bin/env bun

import assert from 'node:assert/strict'
import {
  sanitizeGeminiFreshTurnBoundaryMessages,
  shouldResetGeminiContinuationForInput,
} from '../source/src/services/api/geminiReplaySanitizer.js'

assert.equal(shouldResetGeminiContinuationForInput('continue'), false)
assert.equal(shouldResetGeminiContinuationForInput('resume with the same task'), false)
assert.equal(shouldResetGeminiContinuationForInput('stop making errors!'), true)

const boundaryReset = sanitizeGeminiFreshTurnBoundaryMessages({
  messages: [
    {
      type: 'user',
      isMeta: true,
      message: {
        role: 'user',
        content: 'resume directly with old task',
      },
    },
    {
      type: 'user',
      message: {
        role: 'user',
        content: '[Request interrupted by user]',
      },
    },
    {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'old assistant work' }],
      },
    },
    {
      type: 'user',
      isVisibleInTranscriptOnly: true,
      message: {
        role: 'user',
        content: 'steer checkpoint only',
      },
    },
    {
      type: 'user',
      message: {
        role: 'user',
        content: 'stop making errors!',
      },
    },
  ] as never,
  newMessages: [
    {
      type: 'user',
      message: {
        role: 'user',
        content: 'stop making errors!',
      },
    },
  ] as never,
  input: 'stop making errors!',
})

assert.equal(boundaryReset.length, 2)
assert.equal(boundaryReset[0]?.type, 'assistant')
assert.equal(
  (boundaryReset[1] as { message?: { content?: unknown } }).message?.content,
  'stop making errors!',
)

const explicitContinue = sanitizeGeminiFreshTurnBoundaryMessages({
  messages: [
    {
      type: 'user',
      isMeta: true,
      message: {
        role: 'user',
        content: 'resume directly',
      },
    },
    {
      type: 'user',
      message: {
        role: 'user',
        content: 'continue',
      },
    },
  ] as never,
  newMessages: [
    {
      type: 'user',
      message: {
        role: 'user',
        content: 'continue',
      },
    },
  ] as never,
  input: 'continue',
})

assert.equal(explicitContinue.length, 2)

console.log('gemini-fresh-turn-boundary self-test passed')
