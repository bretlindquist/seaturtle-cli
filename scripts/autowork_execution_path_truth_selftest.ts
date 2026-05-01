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
  assert.match(
    authoritySource,
    /const swarmBackend = swarmActive \? options\.backend : 'none'/,
    'expected the shared execution authority seam to clear live backend identity whenever no worker is actually active',
  )

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /function syncAutoworkExecutionStarted[\s\S]*projectAutoworkExecutionAuthority/,
    'expected local execution start to record main-thread truth through the shared execution authority seam',
  )
  assert.match(
    runnerSource,
    /function syncAutoworkLifecycleModeStarted[\s\S]*projectAutoworkExecutionAuthority/,
    'expected local lifecycle waves to record main-thread truth through the shared execution authority seam',
  )
  assert.match(
    runnerSource,
    /function syncAutoworkVerificationBlocked[\s\S]*projectAutoworkExecutionAuthority/,
    'expected verification-blocked state to clear live swarm identity through the shared execution authority seam',
  )
  assert.match(
    runnerSource,
    /function syncAutoworkStopped[\s\S]*projectAutoworkExecutionAuthority/,
    'expected stop-state sync to clear live swarm identity through the shared execution authority seam instead of preserving policy suggestions',
  )

  const remoteTaskSource = read(
    projectRoot,
    'source/src/tasks/RemoteAutoworkTask/RemoteAutoworkTask.ts',
  )
  assert.match(
    remoteTaskSource,
    /syncAutoworkExecutionAuthority/,
    'expected cloud offload supervision to keep cloud identity only through the shared execution authority seam',
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
