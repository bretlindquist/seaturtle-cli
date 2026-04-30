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
    /export type AutoworkLaunchAuthority =/,
    'expected autowork launch authority to be a first-class shared policy type',
  )
  assert.match(
    policySource,
    /export function resolveAutoworkLaunchAuthority\(/,
    'expected autowork launch selection to live behind a shared authority resolver',
  )
  assert.match(
    policySource,
    /kind: 'launch-cloud-local'/,
    'expected the launch authority seam to classify local cloud offload launches',
  )
  assert.match(
    policySource,
    /kind: 'launch-cloud-saved-host'/,
    'expected the launch authority seam to classify single-host cloud offload launches',
  )
  assert.match(
    policySource,
    /kind: 'launch-local-swarm'/,
    'expected the launch authority seam to classify local lifecycle swarm launches',
  )
  assert.match(
    policySource,
    /kind: 'blocked'/,
    'expected the launch authority seam to classify ambiguous launch states explicitly',
  )
  assert.match(
    policySource,
    /formatRequestedTimeBudget\(options\.timeBudgetMs\)/,
    'expected launch-authority messaging to reuse the shared time-budget formatter',
  )

  assert.match(
    commandSource,
    /resolveAutoworkLaunchAuthority,/,
    'expected the autowork command to import the shared launch-authority seam',
  )
  assert.match(
    commandSource,
    /const launchAuthority = resolveAutoworkLaunchAuthority\(/,
    'expected autowork run to select launch behavior through the shared authority seam',
  )
  assert.doesNotMatch(
    commandSource,
    /maybeAutoLaunchCloudOffload/,
    'expected ad hoc auto-launch branching to be removed from the command layer',
  )
  assert.match(
    commandSource,
    /if \(launchAuthority\.kind === 'launch-cloud-local'\)/,
    'expected autowork run to execute cloud-local launches from the shared authority result',
  )
  assert.match(
    commandSource,
    /if \(launchAuthority\.kind === 'launch-cloud-saved-host'\)/,
    'expected autowork run to execute saved-host launches from the shared authority result',
  )
  assert.match(
    commandSource,
    /if \(launchAuthority\.kind === 'blocked'\)/,
    'expected autowork run to surface blocked launch states from the shared authority result',
  )
  assert.match(
    commandSource,
    /if \(launchAuthority\.kind === 'launch-local-swarm'\)/,
    'expected autowork run to execute local lifecycle swarm launches from the shared authority result',
  )
}

run()

console.log('autowork launch authority selftest passed')
