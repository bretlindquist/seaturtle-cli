#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const worktreeSource = readFileSync(
  join(repoRoot, 'source/src/utils/worktree.ts'),
  'utf8',
)

assert.match(
  worktreeSource,
  /export function isGitConfigLockContentionError/,
  'worktree runtime should classify shared git-config lock contention',
)
assert.match(
  worktreeSource,
  /export function buildGitWorktreeAddArgs/,
  'worktree runtime should centralize git worktree add argument construction',
)
assert.match(
  worktreeSource,
  /params\.baseSha/,
  'worktree add arguments should seed the branch from the resolved SHA',
)
assert.doesNotMatch(
  worktreeSource,
  /addArgs\.push\('-B', worktreeBranch, worktreePath, baseBranch\)/,
  'worktree creation should no longer seed from the remote-tracking branch name',
)
assert.match(
  worktreeSource,
  /Worktree creation hit shared git config lock contention; retrying/,
  'worktree creation should retry shared git-config lock contention',
)
assert.match(
  worktreeSource,
  /Hooks-path git config hit shared config lock contention; retrying/,
  'worktree post-creation hook config should also retry shared git-config lock contention',
)

console.log('worktree parallel spawn self-test passed')
