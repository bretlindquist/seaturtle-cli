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
    'source/src/services/autowork/delegationPolicy.ts',
  )
  assert.match(
    policySource,
    /resolveAutoworkLifecycleDelegationPolicy/,
    'expected autowork lifecycle delegation to live behind one centralized policy seam',
  )
  assert.match(
    policySource,
    /mode: 'bounded-agent-sidecars'/,
    'expected lifecycle waves to permit bounded sidecar delegation instead of whole-wave delegation',
  )
  assert.match(
    policySource,
    /Prefer one bounded sidecar at a time unless parallel work is clearly justified\./,
    'expected delegation policy to preserve the single-tasking discipline by default',
  )
  assert.match(
    policySource,
    /Keep workflow packet updates, phase advancement, implementation start, and final completion claims on the main thread\./,
    'expected delegation policy to keep workflow truth and completion authority on the main thread',
  )

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /resolveAutoworkLifecycleDelegationPolicy\(mode\)/,
    'expected lifecycle prompt construction to consume the centralized delegation policy seam',
  )
  assert.match(
    runnerSource,
    /Delegation policy:/,
    'expected lifecycle prompts to expose an explicit delegation section',
  )
  assert.match(
    runnerSource,
    /You may use \$\{delegationPolicy\.toolName\} for bounded sidecar work when it materially helps this \$\{mode\} wave\./,
    'expected lifecycle prompts to permit bounded sidecar delegation through the centralized tool policy',
  )
  assert.match(
    runnerSource,
    /delegationPolicy\.constraints\.map\(line => `- Constraint: \$\{line\}`\)/,
    'expected lifecycle prompts to render the centralized delegation constraints instead of inlining a second authority',
  )
}

run()

console.log('autowork lifecycle delegation policy selftest passed')
