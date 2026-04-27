#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(
  join(
    import.meta.dir,
    '..',
    'source/src/utils/conversationRecovery.ts',
  ),
  'utf8',
)

assert(
  source.includes("import { shouldUseGeminiProvider } from './model/providers.js'"),
  'conversationRecovery should consult the active provider',
)

assert(
  source.includes('const DEFAULT_INTERRUPTED_TURN_RESUME_PROMPT =') &&
    source.includes("'Continue from where you left off.'"),
  'non-Gemini interrupted-turn recovery should preserve the old resume prompt',
)

assert(
  source.includes('const GEMINI_INTERRUPTED_TURN_RESUME_PROMPT ='),
  'Gemini interrupted-turn recovery should define a dedicated resume prompt',
)

assert(
  source.includes('Re-orient from the latest visible user objective'),
  'Gemini interrupted-turn recovery prompt should force re-orientation from the latest visible user objective',
)

assert(
  source.includes('Do not revive older hidden scaffolding or unrelated prior objectives.'),
  'Gemini interrupted-turn recovery prompt should explicitly forbid reviving older hidden objectives',
)

assert(
  source.includes('const continuationPrompt = shouldUseGeminiProvider()'),
  'conversationRecovery should choose the resume prompt based on the active provider',
)

console.log('gemini-conversation-recovery self-test passed')
