import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const source = readFileSync(
    join(repoRoot, 'source/src/screens/repl/ReplShellHelpers.tsx'),
    'utf8',
  )

  assert.match(
    source,
    /useDeferredValue,\s*useEffect,\s*useState/,
    'transcript search bar should import useDeferredValue for query refinement',
  )
  assert.match(
    source,
    /const appliedQuery = useDeferredValue\(query\)/,
    'transcript search bar should defer the expensive search query application',
  )
  assert.match(
    source,
    /jumpRef\.current\?\.setSearchQuery\(appliedQuery\)/,
    'transcript search bar should apply the deferred query to the jump handle',
  )
}

run()

console.log('transcript-search-deferred-query selftest passed')
