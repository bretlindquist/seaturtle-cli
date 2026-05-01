import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { isDisallowedMetaPrompt } from '../source/src/utils/metaPromptGuard.js'

const repoRoot = join(import.meta.dir, '..')

assert.equal(isDisallowedMetaPrompt('clear'), true)
assert.equal(
  isDisallowedMetaPrompt('cd /Users/bretlindquist/git/seabubble/V2 && clear'),
  true,
)
assert.equal(
  isDisallowedMetaPrompt('cd "/tmp/path with space" && clear'),
  true,
)
assert.equal(isDisallowedMetaPrompt('/autowork run 8h'), false)
assert.equal(isDisallowedMetaPrompt('continue'), false)

const queueSource = readFileSync(
  join(repoRoot, 'source/src/utils/messageQueueManager.ts'),
  'utf8',
)
assert.match(
  queueSource,
  /command\.isMeta[\s\S]*isDisallowedMetaPrompt\(command\.value\)/,
  'expected queued hidden/system prompts to use the shared meta prompt guard',
)

const incomingSource = readFileSync(
  join(repoRoot, 'source/src/screens/repl/useIncomingSubmissions.tsx'),
  'utf8',
)
assert.match(
  incomingSource,
  /options\?\.isMeta && isDisallowedMetaPrompt\(content\)/,
  'expected direct hidden/system prompt submissions to use the shared meta prompt guard',
)

console.log('meta prompt guard selftest passed')
