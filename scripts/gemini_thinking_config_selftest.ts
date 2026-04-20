#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { buildGeminiThinkingConfig } from '../source/src/services/api/geminiThinkingConfig.js'

assert.deepEqual(
  buildGeminiThinkingConfig({
    model: 'gemini-3.1-pro-preview',
    effortValue: 'low',
    thinkingConfig: { type: 'adaptive' },
  }),
  { thinkingConfig: { thinkingLevel: 'low' } },
)

assert.deepEqual(
  buildGeminiThinkingConfig({
    model: 'gemini-3.1-pro-preview',
    effortValue: 'max',
    thinkingConfig: { type: 'adaptive' },
  }),
  { thinkingConfig: { thinkingLevel: 'high' } },
)

assert.deepEqual(
  buildGeminiThinkingConfig({
    model: 'gemini-3-flash-preview',
    effortValue: 'medium',
    thinkingConfig: { type: 'adaptive' },
  }),
  { thinkingConfig: { thinkingLevel: 'medium' } },
)

assert.deepEqual(
  buildGeminiThinkingConfig({
    model: 'gemini-3-flash-preview',
    thinkingConfig: { type: 'disabled' },
  }),
  { thinkingConfig: { thinkingLevel: 'minimal' } },
)

assert.deepEqual(
  buildGeminiThinkingConfig({
    model: 'gemini-2.5-flash',
    effortValue: 'high',
    thinkingConfig: { type: 'adaptive' },
  }),
  { thinkingConfig: { thinkingBudget: 8192 } },
)

assert.deepEqual(
  buildGeminiThinkingConfig({
    model: 'gemini-2.5-flash',
    thinkingConfig: { type: 'disabled' },
  }),
  { thinkingConfig: { thinkingBudget: 0 } },
)

const gemini3 = buildGeminiThinkingConfig({
  model: 'gemini-3-flash-preview',
  effortValue: 'high',
  thinkingConfig: { type: 'adaptive' },
})
assert.equal(
  'thinkingBudget' in (gemini3.thinkingConfig ?? {}),
  false,
)

const gemini25 = buildGeminiThinkingConfig({
  model: 'gemini-2.5-pro',
  effortValue: 'medium',
  thinkingConfig: { type: 'adaptive' },
})
assert.equal(
  'thinkingLevel' in (gemini25.thinkingConfig ?? {}),
  false,
)

console.log('gemini-thinking-config self-test passed')
