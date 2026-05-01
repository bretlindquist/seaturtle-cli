import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const printSource = read(projectRoot, 'source/src/cli/print.ts')
  assert.match(
    printSource,
    /SEATURTLE_WORKFLOW_HANDOFF_STREAM_INTERVAL_MS/,
    'expected headless print mode to accept a workflow handoff stream interval env seam',
  )
  assert.match(
    printSource,
    /setInterval\(\(\) => \{\s*emitWorkflowHandoff\(false\)/,
    'expected headless print mode to emit workflow handoff updates periodically while a run is active',
  )

  const offloadSource = read(
    projectRoot,
    'source/src/services/autowork/remoteOffload.ts',
  )
  assert.match(
    offloadSource,
    /onWorkflowHandoff\?: \(handoff: WorkflowHandoffPacket\) => void/,
    'expected remote offload to expose a live workflow handoff callback',
  )
  assert.match(
    offloadSource,
    /callbacks\.onWorkflowHandoff\?\.\(parsed\.workflow_handoff\)/,
    'expected remote offload to parse live workflow handoff stream messages incrementally',
  )

  const taskSource = read(
    projectRoot,
    'source/src/tasks/RemoteAutoworkTask/RemoteAutoworkTask.ts',
  )
  assert.match(
    taskSource,
    /getRemoteAutoworkHandoffPath/,
    'expected remote autowork supervision to persist a dedicated handoff mirror sidecar path',
  )
  assert.match(
    taskSource,
    /importRunningWorkflowHandoff/,
    'expected remote autowork supervision to import workflow progress while the child is still active',
  )
  assert.match(
    taskSource,
    /projectAutoworkExecutionAuthority\(/,
    'expected imported workflow progress to reapply the outer cloud-active overlay through the shared execution authority seam after each handoff import',
  )
}

run()

console.log('autowork cloud progress sync selftest passed')
