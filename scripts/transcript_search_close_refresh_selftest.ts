import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const source = readFileSync(
    join(
      repoRoot,
      'source/src/screens/repl/useTranscriptSearchController.ts',
    ),
    'utf8',
  )

  assert.match(
    source,
    /prevSearchOpenRef/,
    'transcript search controller should track the prior search-open state',
  )
  assert.match(
    source,
    /if \(!wasOpen \|\| searchOpen \|\| !searchQuery\)/,
    'transcript search refresh should be driven by the search-open transition after close',
  )
  assert.match(
    source,
    /setTimeout\(\(\) => {\s*jumpRef\.current\?\.refreshCurrentMatch\(\);\s*}, 0\)/,
    'transcript search controller should refresh the current match after the close transition',
  )
  assert.match(
    source,
    /setTimeout\(\(\) => {\s*jumpRef\.current\?\.refreshCurrentMatch\(\);\s*}, 16\)/,
    'transcript search controller should schedule a second refresh pass after layout settles',
  )
  assert.doesNotMatch(
    source,
    /const refreshAfterLayout =/,
    'transcript search controller should not keep the old ad-hoc close handler refresh helper',
  )
}

run()

console.log('transcript search close-refresh self-test passed')
