#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const finalizeReplQueryTurn = read(
  'source/src/screens/repl/finalizeReplQueryTurn.ts',
)
const promptInput = read('source/src/components/PromptInput/PromptInput.tsx')

assert.match(
  finalizeReplQueryTurn,
  /key:\s*'project-remindme'[\s\S]*priority:\s*'medium'/m,
  'project remindme notice should use queued medium priority so it survives competing immediate toasts',
)

assert.match(
  finalizeReplQueryTurn,
  /key:\s*'project-remindme'[\s\S]*timeoutMs:\s*0x7fffffff/m,
  'project remindme notice should stay visible after replies until the next user action',
)

assert.match(
  finalizeReplQueryTurn,
  /key:\s*'project-remindme'[\s\S]*fold:\s*\(_current,\s*incoming\)\s*=>\s*incoming/m,
  'project remindme notice should refresh cleanly across turns',
)

assert.match(
  promptInput,
  /removeNotification\('project-remindme'\)/,
  'typing should dismiss the post-reply remindme footer notice',
)

console.log('remindme reply notice self-test passed')
