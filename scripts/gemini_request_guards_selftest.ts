#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dirname, '..')
const guardSource = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiRequestGuards.ts'),
  'utf8',
)
const geminiSource = readFileSync(
  join(repoRoot, 'source/src/services/api/gemini.ts'),
  'utf8',
)

assert.match(
  guardSource,
  /GEMINI_MAX_INLINE_REQUEST_BYTES = 20 \* 1024 \* 1024/,
  'Gemini request guards should enforce the 20 MB inline request cap.',
)
assert.match(
  guardSource,
  /max output tokens/i,
  'Gemini request guards should reject output-token settings above the model limit.',
)
assert.match(
  guardSource,
  /context window/i,
  'Gemini request guards should reject prompts that are estimated to exceed the model context window.',
)
assert.match(
  geminiSource,
  /validateGeminiRequestAgainstModelLimits/,
  'Gemini request building should run the model/request limit guards before execution.',
)

console.log('gemini-request-guards self-test passed')
