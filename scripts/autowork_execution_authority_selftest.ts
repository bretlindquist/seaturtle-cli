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
    'source/src/services/autowork/executionAuthority.ts',
  )
  const runnerSource = read(
    projectRoot,
    'source/src/services/autowork/runner.ts',
  )
  const localSwarmSource = read(
    projectRoot,
    'source/src/services/autowork/localLifecycleSwarm.ts',
  )
  const remoteTaskSource = read(
    projectRoot,
    'source/src/tasks/RemoteAutoworkTask/RemoteAutoworkTask.ts',
  )

  assert.match(
    authoritySource,
    /export function projectAutoworkExecutionAuthority\(/,
    'expected autowork execution-path projection to live behind a shared packet helper',
  )
  assert.match(
    authoritySource,
    /export function syncAutoworkExecutionAuthority\(/,
    'expected autowork execution-path projection to expose a shared runtime-sync helper',
  )
  assert.match(
    authoritySource,
    /swarmBackend: normalized\.swarmBackend/,
    'expected the shared authority seam to own swarm backend projection',
  )
  assert.match(
    authoritySource,
    /swarmActive: normalized\.swarmActive/,
    'expected the shared authority seam to own swarm activity projection',
  )
  assert.match(
    authoritySource,
    /swarmWorkerCount: normalized\.swarmWorkerCount/,
    'expected the shared authority seam to own worker-count projection',
  )

  assert.match(
    runnerSource,
    /projectAutoworkExecutionAuthority/,
    'expected the main-thread autowork runner to route execution-path projection through the shared authority seam',
  )
  assert.match(
    localSwarmSource,
    /syncAutoworkExecutionAuthority/,
    'expected local lifecycle swarm to route execution-path projection through the shared authority seam',
  )
  assert.match(
    remoteTaskSource,
    /syncAutoworkExecutionAuthority/,
    'expected remote autowork supervision to route terminal cloud execution-path projection through the shared authority seam',
  )
  assert.match(
    remoteTaskSource,
    /projectAutoworkExecutionAuthority/,
    'expected remote autowork handoff imports to reuse the shared authority seam while the cloud child is active',
  )
}

run()

console.log('autowork execution authority selftest passed')
