import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const policySource = read(
    projectRoot,
    'source/src/services/autowork/backendPolicy.ts',
  )
  const commandSource = read(
    projectRoot,
    'source/src/commands/autowork/autowork.tsx',
  )

  assert.match(
    policySource,
    /savedSshHosts\?: string\[]/,
    'expected backend policy options to accept authoritative saved SSH hosts for launch selection',
  )
  assert.match(
    policySource,
    /mode: 'local'[\s\S]*No saved SSH configs are present/,
    'expected bounded lifecycle cloud auto-launch to fall back deterministically to the local provider child when no saved SSH config exists',
  )
  assert.match(
    policySource,
    /mode: 'saved-host'[\s\S]*Exactly one saved SSH config is present/,
    'expected bounded lifecycle cloud auto-launch to reuse the sole saved SSH config when there is no ambiguity',
  )
  assert.match(
    policySource,
    /mode: 'explicit-host-required'[\s\S]*Multiple saved SSH configs are present/,
    'expected bounded lifecycle cloud auto-launch to refuse guessing when multiple saved SSH configs exist',
  )

  assert.match(
    commandSource,
    /SEATURTLE_AUTOWORK_OFFLOAD_CHILD === '1'/,
    'expected the normal autowork run path to suppress recursive auto-offload inside offload children',
  )
  assert.match(
    commandSource,
    /auto-offloaded to cloud supervision/,
    'expected the autowork command to surface truthful auto-offload messaging when policy launches the background cloud path',
  )
  assert.match(
    policySource,
    /cloud <ssh-host> run \$\{formatRequestedTimeBudget\(options\.timeBudgetMs\)\}/,
    'expected ambiguous multi-host auto-offload states to route the operator back to an explicit host choice from the shared backend policy seam',
  )
}

run()

console.log('autowork cloud auto-launch selftest passed')
