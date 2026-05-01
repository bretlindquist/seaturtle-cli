#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const source = readFileSync(
  join(repoRoot, 'source/src/utils/gracefulShutdown.ts'),
  'utf8',
)

assert.match(
  source,
  /CURSOR_LEFT,\s*[\s\S]*eraseToEndOfScreen,/,
  'gracefulShutdown should import the cursor reset and display erase helpers',
)

assert.ok(
  source.includes(
    '`${CURSOR_LEFT}${eraseToEndOfScreen()}${chalk.dim(',
  ) &&
    source.includes(
      '`\\nResume this session with:\\nct --resume ${resumeArg}\\n`',
    ),
  'resume hint should clear stale terminal content before writing the hint',
)

console.log('graceful-shutdown-resume-hint self-test passed')
