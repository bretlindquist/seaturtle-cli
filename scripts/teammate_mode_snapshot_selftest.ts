import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const source = readFileSync(
    join(
      repoRoot,
      'source/src/utils/swarm/backends/teammateModeSnapshot.ts',
    ),
    'utf8',
  )

  assert.match(
    source,
    /Lazy capture on first read before startup snapshot/,
    'teammate mode snapshot should explicitly treat pre-capture reads as lazy initialization',
  )
  assert.doesNotMatch(
    source,
    /getTeammateModeFromSnapshot called before capture - this indicates an initialization bug/,
    'teammate mode snapshot should not log a false initialization error on lazy reads',
  )
}

run()

console.log('teammate mode snapshot self-test passed')
