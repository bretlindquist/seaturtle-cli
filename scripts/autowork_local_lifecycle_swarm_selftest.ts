import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const swarmSource = read(
    projectRoot,
    'source/src/services/autowork/localLifecycleSwarm.ts',
  )
  assert.match(
    swarmSource,
    /export function canLaunchLocalLifecycleSwarm/,
    'expected autowork local lifecycle swarm gating to live behind one centralized service seam',
  )
  assert.match(
    swarmSource,
    /backendPolicy\.target === 'local-swarm'/,
    'expected local lifecycle swarm launching to honor the centralized backend policy target',
  )
  assert.match(
    swarmSource,
    /registerAsyncAgent\(/,
    'expected local lifecycle swarm launching to reuse the existing background-agent task substrate',
  )
  assert.match(
    swarmSource,
    /runAsyncAgentLifecycle\(/,
    'expected local lifecycle swarm launching to reuse the shared async agent lifecycle runner',
  )
  assert.match(
    swarmSource,
    /syncAutoworkExecutionAuthority/,
    'expected local lifecycle swarm activity to project truthful local swarm state through the shared execution authority seam',
  )

  const commandSource = read(
    projectRoot,
    'source/src/commands/autowork/autowork.tsx',
  )
  assert.match(
    commandSource,
    /launchLocalLifecycleSwarm/,
    'expected /autowork run to route lifecycle waves through the local swarm launcher when appropriate',
  )
  assert.match(
    commandSource,
    /Execution path: local swarm \(in-process\)/,
    'expected autowork to report the truthful in-process local swarm path when it launches that lifecycle worker',
  )

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /function hasActiveLocalLifecycleSwarm/,
    'expected the runner to guard against starting a second local lifecycle worker while one is already authoritative',
  )
  assert.match(
    runnerSource,
    /local-swarm lifecycle run/,
    'expected the runner guard to explain the active local lifecycle worker truthfully',
  )
}

run()

console.log('autowork local lifecycle swarm selftest passed')
