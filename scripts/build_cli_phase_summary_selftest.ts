#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const source = readFileSync(join(repoRoot, 'scripts', 'build-cli.mjs'), 'utf8')

assert.match(
  source,
  /function printBuildPhaseSummary\(\)/,
  'build-cli should expose a phase-summary printer',
)

assert.match(
  source,
  /\[SeaTurtle CT build\] Phase summary/,
  'build-cli should print a branded phase summary header',
)

for (const phaseName of [
  'workspace prepare',
  'overlay dependencies',
  'workspace augmentation',
  'bundle',
  'finalize',
]) {
  assert.match(
    source,
    new RegExp(`['"]${phaseName}['"]`),
    `build-cli should record the ${phaseName} phase`,
  )
}

assert.match(
  source,
  /reused \$\{packageNames\.length\} packages on attempt \$\{attemptNumber\}/,
  'build-cli should distinguish overlay reuse in phase details',
)

assert.match(
  source,
  /installed \$\{packageNames\.length\} packages on attempt \$\{attemptNumber\}/,
  'build-cli should distinguish overlay installs in phase details',
)

console.log('build-cli-phase-summary selftest passed')
