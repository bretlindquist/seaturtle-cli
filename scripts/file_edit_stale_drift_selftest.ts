#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const source = readFileSync(
  join(repoRoot, 'source/src/tools/FileEditTool/FileEditTool.ts'),
  'utf8',
)

assert.match(
  source,
  /function isFullReadFileState/,
  'FileEditTool should distinguish full-read state from partial-read state',
)
assert.match(
  source,
  /A full read gives us enough context to safely retarget a narrow/,
  'FileEditTool should allow narrow edits to retarget after full-read drift',
)
assert.match(
  source,
  /if \(!isFullRead && !contentUnchanged\)/,
  'FileEditTool should only fail on unexpected modification when the last read was partial',
)

console.log('file-edit stale drift self-test passed')
