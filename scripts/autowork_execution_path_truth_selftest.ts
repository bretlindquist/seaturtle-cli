import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /function syncAutoworkExecutionStarted[\s\S]*swarmBackend: 'none'[\s\S]*swarmActive: false[\s\S]*swarmWorkerCount: 0/,
    'expected local execution start to record main-thread truth instead of policy-derived swarm state',
  )
  assert.match(
    runnerSource,
    /function syncAutoworkLifecycleModeStarted[\s\S]*swarmBackend: 'none'[\s\S]*swarmActive: false[\s\S]*swarmWorkerCount: 0/,
    'expected local lifecycle waves to record main-thread truth instead of policy-derived swarm state',
  )
  assert.match(
    runnerSource,
    /function syncAutoworkVerificationBlocked[\s\S]*swarmBackend: 'none'[\s\S]*swarmActive: false[\s\S]*swarmWorkerCount: 0/,
    'expected verification-blocked state to clear live swarm identity when no actual swarm is active',
  )
  assert.match(
    runnerSource,
    /function syncAutoworkStopped[\s\S]*swarmBackend: 'none'[\s\S]*swarmActive: false[\s\S]*swarmWorkerCount: 0/,
    'expected stop-state sync to clear live swarm identity instead of preserving policy suggestions',
  )

  const remoteTaskSource = read(
    projectRoot,
    'source/src/tasks/RemoteAutoworkTask/RemoteAutoworkTask.ts',
  )
  assert.match(
    remoteTaskSource,
    /swarmBackend: options\.active \? 'cloud' : 'none'/,
    'expected cloud offload supervision to keep cloud identity only while the offload is actually active',
  )

  const inspectionSource = read(
    projectRoot,
    'source/src/services/autowork/inspectionSummary.ts',
  )
  assert.match(
    inspectionSource,
    /function formatActualExecutionPath/,
    'expected inspection summary to compute actual execution path separately from backend policy',
  )
  assert.match(
    inspectionSource,
    /case 'cloud-offload':\s*return 'cloud offload'/,
    'expected inspection policy labels to use cloud-offload naming for the provider-managed remote-host path',
  )
}

run()

console.log('autowork execution path truth selftest passed')
