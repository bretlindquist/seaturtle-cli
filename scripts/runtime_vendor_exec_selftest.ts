#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { statSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dirname, '..')

for (const relativePath of [
  'source/runtime-vendor/ripgrep/arm64-darwin/rg',
  'source/runtime-vendor/ripgrep/x64-darwin/rg',
  'source/runtime-vendor/ripgrep/arm64-linux/rg',
  'source/runtime-vendor/ripgrep/x64-linux/rg',
]) {
  const mode = statSync(join(repoRoot, relativePath)).mode
  assert(
    (mode & 0o111) !== 0,
    `expected ${relativePath} to be executable`,
  )
}

console.log('runtime-vendor exec self-test passed')
