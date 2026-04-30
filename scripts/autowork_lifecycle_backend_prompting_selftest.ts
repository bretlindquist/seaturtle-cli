import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const runnerSource = read(
    projectRoot,
    'source/src/services/autowork/runner.ts',
  )

  assert.match(
    runnerSource,
    /resolveAutoworkBackendPolicy/,
    'expected lifecycle prompt construction to consume autowork backend policy',
  )
  assert.match(
    runnerSource,
    /Preferred orchestration path: \$\{formatLifecycleBackendTarget\(backendPolicy\)\}\./,
    'expected lifecycle prompts to state the preferred orchestration path explicitly',
  )
  assert.match(
    runnerSource,
    /Preferred sidecar path: use \$\{delegationPolicy\.toolName\} through \$\{formatLifecycleBackendTarget\(backendPolicy\)\}/,
    'expected lifecycle prompts to emit concrete local-swarm sidecar guidance when local swarm is preferred',
  )
  assert.match(
    runnerSource,
    /Keep the leader turn authoritative: sidecars gather evidence or review findings, then reconcile the results through \$\{WORKFLOW_STATE_TOOL_NAME\}\./,
    'expected lifecycle prompts to preserve main-thread authority when sidecars are used',
  )
  assert.match(
    runnerSource,
    /cloudOffloadActive: hasActiveCloudOffload\(/,
    'expected lifecycle backend prompting to preserve cloud-offload precedence when the offload path is already active',
  )
}

run()

console.log('autowork lifecycle backend prompting selftest passed')
