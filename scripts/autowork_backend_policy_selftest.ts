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

  const inspectionSource = read(
    projectRoot,
    'source/src/services/autowork/inspectionSummary.ts',
  )
  assert.match(
    inspectionSource,
    /Orchestration: \$\{formatBackendTarget\(backendPolicy\)\}/,
    'expected autowork status surfaces to show the selected orchestration backend',
  )
  assert.match(
    inspectionSource,
    /Cloud swarm: \$\{formatCloudSwarmStatus\(backendPolicy\)\}/,
    'expected autowork status surfaces to show truthful cloud swarm status',
  )
  assert.match(
    inspectionSource,
    /Cloud recommendation: \$\{formatCloudRecommendation\(backendPolicy\)\}/,
    'expected autowork status surfaces to show the distinct cloud recommendation state',
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

  assert.match(
    policySource,
    /cloudRecommendation: CloudSwarmRecommendation/,
    'expected backend policy to carry a first-class cloud recommendation state',
  )
  assert.match(
    policySource,
    /shouldRecommendCloudOffload/,
    'expected backend policy to classify when a lifecycle wave should escalate toward remote-host offload',
  )
  assert.match(
    policySource,
    /ct ssh-check --local[\s\S]*ct ssh <host> \[dir\]/,
    'expected backend policy to preserve the live-gate-first remote offload next step',
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
