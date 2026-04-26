#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const mainSource = readFileSync(join(repoRoot, 'source/src/main.tsx'), 'utf8')
const startupSigintHandler = mainSource.match(
  /process\.on\('SIGINT', \(\) => \{[\s\S]*?\n  \}\);\n  profileCheckpoint\('main_warning_handler_initialized'\);/,
)

assert.ok(
  startupSigintHandler,
  'expected to find the interactive startup SIGINT handler in main.tsx',
)

assert.match(
  startupSigintHandler[0],
  /gracefulShutdownSync\(0\);/,
  'interactive startup SIGINT should route through graceful shutdown instead of hard process exit',
)

assert.doesNotMatch(
  startupSigintHandler[0],
  /process\.exit\(0\);/,
  'interactive startup SIGINT should not bypass cleanup with process.exit(0)',
)

console.log('startup-sigint self-test passed')
