#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const source = readFileSync(
  join(repoRoot, 'source/src/tools/AgentTool/AgentTool.tsx'),
  'utf8',
)

assert.match(
  source,
  /Before merging or cherry-picking this worktree result, verify the parent repo is clean\./,
  'AgentTool should warn the parent not to integrate a worktree result into a dirty repo',
)

console.log('agent worktree result notice self-test passed')
