import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const authoritySource = read(
    projectRoot,
    'source/src/services/autowork/supervisionAuthority.ts',
  )
  assert.match(
    authoritySource,
    /export async function inspectActiveSupervisedAutoworkRun/,
    'expected a shared supervised-autowork inspector to exist',
  )
  assert.match(
    authoritySource,
    /listRemoteAutoworkMetadata\(\)/,
    'expected the shared supervision authority to inspect cloud-offload metadata',
  )
  assert.match(
    authoritySource,
    /listLocalLifecycleSwarmMetadata\(\)/,
    'expected the shared supervision authority to inspect local lifecycle metadata',
  )
  assert.match(
    authoritySource,
    /getWorkflowPacketFallback/,
    'expected the shared supervision authority to keep workflow execution state as a fallback truth surface',
  )

  const runnerSource = read(
    projectRoot,
    'source/src/services/autowork/runner.ts',
  )
  assert.match(
    runnerSource,
    /inspectActiveSupervisedAutoworkRun\(/,
    'expected the autowork runner to route active supervised-run guards through the shared authority seam',
  )
  assert.match(
    runnerSource,
    /getSupervisedAutoworkGuardMessage\(/,
    'expected the autowork runner to reuse the shared supervision guard messaging seam',
  )
  assert.doesNotMatch(
    runnerSource,
    /getActiveCloudOffloadGuardMessage\(/,
    'expected backend-specific cloud guard helpers to stop being the primary runner authority',
  )
  assert.doesNotMatch(
    runnerSource,
    /getActiveLocalLifecycleSwarmGuardMessage\(/,
    'expected backend-specific local-swarm guard helpers to stop being the primary runner authority',
  )
}

run()

console.log('autowork supervision authority selftest passed')
