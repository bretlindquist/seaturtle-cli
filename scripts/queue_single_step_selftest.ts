import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const processorSource = read(repoRoot, 'source/src/utils/queueProcessor.ts')

  assert.match(
    processorSource,
    /isPromptLikeInputMode\(next\.mode\)/,
    'expected prompt-like queued commands to be recognized as a dedicated one-at-a-time path',
  )
  assert.match(
    processorSource,
    /isSlashCommand\(next\) \|\|[\s\S]*next\.mode === 'bash' \|\|[\s\S]*isPromptLikeInputMode\(next\.mode\)/,
    'expected slash, bash, and prompt-like commands to share the single-item dequeue path',
  )
  assert.match(
    processorSource,
    /Drain remaining non-prompt system items with the same mode at once/,
    'expected batching to be limited to non-prompt system queue items',
  )
  assert.match(
    processorSource,
    /const commands = dequeueAllMatching\(/,
    'expected system queue batching to remain on the dedicated dequeueAllMatching path',
  )
}

run()

console.log('queue single-step selftest passed')
