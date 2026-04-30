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
    /export function dequeueNextExecutionBatch\(/,
    'expected queue execution selection to live behind one shared helper seam',
  )
  assert.match(
    processorSource,
    /const commands = dequeueNextExecutionBatch\(isMainThread\)/,
    'expected the interactive queue processor to consume the shared execution selection seam',
  )
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
    /Remaining non-prompt system items can still batch when/,
    'expected batching to remain limited to the shared non-prompt system queue path',
  )
  assert.match(
    processorSource,
    /return dequeueAllMatching\(cmd =>/,
    'expected system queue batching to remain on the dedicated shared helper path',
  )
  assert.match(
    headlessSource,
    /dequeueNextExecutionBatch\(isMainThread\)/,
    'expected headless queue draining to reuse the shared queue execution selection seam',
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
