import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const inspectionSource = read(
    projectRoot,
    'source/src/services/autowork/inspectionSummary.ts',
  )
  assert.match(
    inspectionSource,
    /resolveAutoworkLifecycleDelegationPolicy/,
    'expected autowork inspection surfaces to derive lifecycle delegation truth from the central policy seam',
  )
  assert.match(
    inspectionSource,
    /Lifecycle delegation: \$\{formatLifecycleDelegation\(context\)\}/,
    'expected autowork status and doctor to surface the lifecycle delegation line',
  )
  assert.match(
    inspectionSource,
    /Lifecycle delegation policy: \$\{delegationPolicy\.summary\}/,
    'expected autowork doctor to explain the lifecycle delegation summary',
  )
  assert.match(
    inspectionSource,
    /Lifecycle delegation constraints:/,
    'expected autowork doctor to show lifecycle delegation constraints when the policy applies',
  )

  const readmeSource = read(projectRoot, 'README.md')
  assert.match(
    readmeSource,
    /bounded Agent sidecars for research and review support/,
    'expected README autowork docs to explain bounded lifecycle sidecars',
  )
  assert.match(
    readmeSource,
    /final completion claims remain main-thread authoritative/,
    'expected README autowork docs to preserve main-thread authority for completion claims',
  )

  const featuresRouterSource = read(projectRoot, 'docs/FEATURES-ROUTER.md')
  assert.match(
    featuresRouterSource,
    /bounded Agent sidecars for research and review support/,
    'expected feature-router docs to explain bounded lifecycle sidecars',
  )
  assert.match(
    featuresRouterSource,
    /implementation start, and final completion claims remain main-thread authoritative/,
    'expected feature-router docs to preserve main-thread lifecycle authority',
  )

  const autoworkIndexSource = read(
    projectRoot,
    'source/src/commands/autowork/index.ts',
  )
  assert.match(
    autoworkIndexSource,
    /bounded lifecycle sidecars/,
    'expected the autowork command description to advertise bounded lifecycle sidecars',
  )

  const swimIndexSource = read(projectRoot, 'source/src/commands/swim/index.ts')
  assert.match(
    swimIndexSource,
    /bounded lifecycle sidecars/,
    'expected the swim command description to advertise bounded lifecycle sidecars',
  )
}

run()

console.log('autowork lifecycle delegation visibility selftest passed')
