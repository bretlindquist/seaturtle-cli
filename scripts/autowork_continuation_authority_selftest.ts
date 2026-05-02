import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const continuationSource = read(
    projectRoot,
    'source/src/services/autowork/continuationAuthority.ts',
  )
  assert.match(
    continuationSource,
    /export async function resolveAutoworkContinuationCommand/,
    'expected a shared autowork continuation resolver to exist',
  )
  assert.match(
    continuationSource,
    /implementedButUnverified && state\.currentChunkId/,
    'expected autowork continuation authority to route verification from persisted state',
  )
  assert.match(
    continuationSource,
    /isLifecycleMode\(state\.currentMode\)/,
    'expected lifecycle autowork continuation to be resolved from persisted mode state',
  )
  assert.match(
    continuationSource,
    /resolveAutoworkRunEntryAuthority\(entryPoint, 'run', root\)/,
    'expected continuation to reuse the shared run-entry authority before re-entering autowork',
  )
  assert.match(
    continuationSource,
    /inspectAndSelectAutoworkMode\(entry\.planPath\)/,
    'expected execution-phase continuation to reassess workflow state only after shared run-entry authority succeeds',
  )
  assert.match(
    continuationSource,
    /priority: 'later'/,
    'expected autowork continuation scheduling to yield to explicit user input when queued',
  )

  const hookSource = read(projectRoot, 'source/src/hooks/useQueueProcessor.ts')
  assert.match(
    hookSource,
    /enqueueAutoworkContinuationIfNeeded\(\)/,
    'expected interactive queue processing to reuse the shared autowork continuation scheduler',
  )

  const printSource = read(projectRoot, 'source/src/cli/print.ts')
  assert.match(
    printSource,
    /await enqueueAutoworkContinuationIfNeeded\(\)/,
    'expected headless queue processing to reuse the shared autowork continuation scheduler',
  )

  const stateSource = read(projectRoot, 'source/src/services/autowork/state.ts')
  assert.match(
    stateSource,
    /export type AutoworkEntryPoint = 'autowork' \| 'swim'/,
    'expected autowork state to persist the command family that launched the run',
  )
  assert.match(
    stateSource,
    /entryPoint: 'autowork'/,
    'expected autowork state defaults to include an entry-point authority field',
  )

  const commandSource = read(
    projectRoot,
    'source/src/commands/autowork/autowork.tsx',
  )
  assert.doesNotMatch(
    commandSource,
    /submitNextInput: true/,
    'expected autowork command chaining to stop depending on submitNextInput',
  )
}

run()

console.log('autowork continuation authority selftest passed')
