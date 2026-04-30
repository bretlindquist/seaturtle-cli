import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const processorSource = read(repoRoot, 'source/src/utils/queueProcessor.ts')
  const headlessSource = read(repoRoot, 'source/src/cli/print.ts')

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
  assert.match(
    headlessSource,
    /Prompt-like queued commands advance one item at a time so\s+\/\/ headless mode matches the interactive queue semantics\./,
    'expected headless queue draining to document the same one-at-a-time prompt semantics',
  )
  assert.doesNotMatch(
    headlessSource,
    /while \(canBatchWith\(command, peek\(isMainThread\)\)\)/,
    'expected headless queue draining to stop greedily batching prompt-like commands',
  )
  assert.doesNotMatch(
    headlessSource,
    /joinPromptValues\(batch\.map\(c => c\.value\)\)/,
    'expected headless queue draining to stop merging queued prompt payloads into one turn',
  )
}

run()

console.log('queue single-step selftest passed')
