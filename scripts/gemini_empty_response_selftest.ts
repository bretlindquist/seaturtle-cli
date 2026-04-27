#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const geminiSource = readFileSync(
  join(repoRoot, 'source/src/services/api/gemini.ts'),
  'utf8',
)

assert.match(
  geminiSource,
  /export function isRetryableGeminiEmptyResponse/,
  'Gemini runtime should classify retryable empty responses',
)
assert.match(
  geminiSource,
  /export function describeGeminiEmptyResponse/,
  'Gemini runtime should describe empty Gemini responses with provider-aware copy',
)
assert.match(
  geminiSource,
  /content\.length === 0 && isRetryableGeminiEmptyResponse\(payload\)/,
  'Gemini plain-text path should retry transient empty responses once',
)
assert.match(
  geminiSource,
  /throw new Error\(describeGeminiEmptyResponse\(payload\)\)/,
  'Gemini plain-text path should replace the generic empty-response error with provider-aware details',
)
assert.match(
  geminiSource,
  /throw new Error\(describeGeminiEmptyResponse\(lastResponse\)\)/,
  'Gemini streaming path should surface provider-aware empty-response errors',
)
assert.match(
  geminiSource,
  /blocked \(\$\{blockReason\}\)/,
  'Gemini empty-response description should include prompt block reasons',
)
assert.match(
  geminiSource,
  /max output token limit/,
  'Gemini empty-response description should explain max-token empty responses',
)

console.log('gemini-empty-response self-test passed')
