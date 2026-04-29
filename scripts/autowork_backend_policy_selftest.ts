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
  assert.match(
    policySource,
    /shouldPreferLocalSwarm/,
    'expected backend policy seam to classify which autowork modes prefer the local swarm path',
  )
  assert.match(
    policySource,
    /case 'research':[\s\S]*case 'plan-hardening':[\s\S]*case 'audit-and-polish':/,
    'expected research and planning lifecycle waves to be eligible for local swarm policy',
  )
  assert.match(
    policySource,
    /case 'execution':[\s\S]*case 'verification':[\s\S]*return false/,
    'expected execution and verification to remain on the main thread',
  )
  assert.match(
    policySource,
    /resolveAutoworkCloudOffloadCapability/,
    'expected backend policy to consume the centralized cloud offload capability seam',
  )

  const commandSource = read(projectRoot, 'source/src/commands/autowork/autowork.tsx')
  assert.match(
    commandSource,
    /Orchestration: \$\{formatBackendTarget\(backendPolicy\)\}/,
    'expected autowork status surfaces to show the selected orchestration backend',
  )
  assert.match(
    commandSource,
    /Cloud swarm: \$\{formatCloudSwarmStatus\(backendPolicy\)\}/,
    'expected autowork status surfaces to show truthful cloud swarm status',
  )

  const capabilitySource = read(
    projectRoot,
    'source/src/services/autowork/cloudOffloadCapability.ts',
  )
  assert.match(
    capabilitySource,
    /Remote-host offload is available via ct ssh/,
    'expected cloud capability truth to be anchored in the ct ssh offload path',
  )
  assert.match(
    capabilitySource,
    /runtime\.provider === 'openai-codex' \|\| runtime\.provider === 'gemini'/,
    'expected cloud capability support to reflect the providers that actually support provider-managed remote-host offload today',
  )

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /resolveAutoworkBackendPolicy/,
    'expected autowork runner lifecycle syncing to use the centralized backend policy seam',
  )
}

run()

console.log('autowork backend policy selftest passed')
