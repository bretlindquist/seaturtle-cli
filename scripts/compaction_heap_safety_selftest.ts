import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

function run(): void {
  const safetySource = read('source/src/services/compact/compactionSafety.ts')
  assert.match(
    safetySource,
    /export function classifyLargeSessionCompactionRisk\(/,
    'expected a shared large-session compaction risk classifier',
  )
  assert.match(
    safetySource,
    /export function projectLegacyCompactionMessages\(/,
    'expected a shared legacy-compaction safety projector',
  )
  assert.match(
    safetySource,
    /LARGE_SESSION_LEGACY_MAX_API_ROUNDS = 200/,
    'expected a bounded legacy compaction round cap for heap-risk sessions',
  )

  const sessionMemorySource = read(
    'source/src/services/compact/sessionMemoryCompact.ts',
  )
  assert.match(
    sessionMemorySource,
    /export function getSessionMemoryCompactionDecision\(/,
    'expected session-memory compaction to use a shared decision helper',
  )
  assert.match(
    sessionMemorySource,
    /reason: 'feature_flag' \| 'forced_large_session'/,
    'expected forced large-session mode to be an explicit session-memory reason',
  )
  assert.match(
    sessionMemorySource,
    /const decision = getSessionMemoryCompactionDecision\(messages\)/,
    'expected trySessionMemoryCompaction to resolve one shared decision before proceeding',
  )

  const compactSource = read('source/src/services/compact/compact.ts')
  assert.match(
    compactSource,
    /projectLegacyCompactionMessages\(compactWindowMessages\)/,
    'expected legacy compaction to project large-session-safe input before summarization',
  )
  assert.match(
    compactSource,
    /forkContextMessages: messagesToSummarize/,
    'expected compact cache-sharing path to reuse the same safety-projected messages',
  )
  assert.doesNotMatch(
    compactSource,
    /\.\.\.getMessagesAfterCompactBoundary\(messages\),\s*summaryRequest/,
    'expected streamCompactSummary to stop rebuilding an extra post-boundary copy of the transcript',
  )

  const autoCompactSource = read('source/src/services/compact/autoCompact.ts')
  assert.match(
    autoCompactSource,
    /trySessionMemoryCompaction\(/,
    'expected autocompact to continue using the shared session-memory compaction entry point',
  )

  const commandSource = read('source/src/commands/compact/compact.ts')
  assert.match(
    commandSource,
    /trySessionMemoryCompaction\(/,
    'expected \/compact to continue using the shared session-memory compaction entry point',
  )

  const inProcessRunnerSource = read(
    'source/src/utils/swarm/inProcessRunner.ts',
  )
  assert.match(
    inProcessRunnerSource,
    /await trySessionMemoryCompaction\(/,
    'expected in-process teammate compaction to use the same shared session-memory safety path',
  )

  console.log('compaction heap safety self-test passed')
}

run()
