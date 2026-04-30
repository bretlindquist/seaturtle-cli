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
    /function isLocalSwarmIntegratedForMode/,
    'expected backend policy to classify local swarm integration from the lifecycle delegation seam',
  )
  assert.match(
    policySource,
    /resolveAutoworkLifecycleDelegationPolicy\(mode\)\.mode !== 'none'/,
    'expected backend policy to treat lifecycle delegation availability as the real local swarm integration seam',
  )
  assert.match(
    policySource,
    /localSwarmIntegrated =[\s\S]*isLocalSwarmIntegratedForMode\(mode\)/,
    'expected backend policy to default local swarm integration from the central lifecycle seam',
  )
  assert.match(
    policySource,
    /if \(\s*localSwarmIntegrated[\s\S]*shouldPreferLocalSwarm\(mode\)/,
    'expected backend policy to select local swarm only when lifecycle integration and preference both apply',
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
    /Execution path: \$\{formatActualExecutionPath\(context\)\}/,
    'expected autowork status surfaces to report the actual live execution path separately from backend policy',
  )
  assert.match(
    inspectionSource,
    /Backend policy: \$\{formatBackendTarget\(backendPolicy\)\}/,
    'expected autowork status surfaces to keep backend policy as a separate recommendation line',
  )
  assert.match(
    inspectionSource,
    /Execution path: \$\{formatActualExecutionPath\(context\)\}/,
    'expected autowork status surfaces to keep actual execution path separate when backend policy prefers local swarm sidecars',
  )
  assert.match(
    inspectionSource,
    /Cloud recommendation: \$\{formatCloudRecommendation\(backendPolicy\)\}/,
    'expected autowork status surfaces to show the distinct cloud recommendation state',
  )
  assert.match(
    inspectionSource,
    /Cloud auto-launch: \$\{formatCloudAutoLaunch\(backendPolicy\)\}/,
    'expected autowork status surfaces to show the distinct cloud auto-launch decision',
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
    /cloudRecommendation: CloudOffloadRecommendation/,
    'expected backend policy to carry a first-class cloud recommendation state',
  )
  assert.match(
    policySource,
    /target: 'cloud-offload'/,
    'expected backend policy to use cloud-offload naming for the provider-managed remote-host path',
  )
  assert.match(
    policySource,
    /shouldRecommendCloudOffload/,
    'expected backend policy to classify when a lifecycle wave should escalate toward remote-host offload',
  )
  assert.match(
    policySource,
    /getCloudAutoLaunchDecision/,
    'expected backend policy to centralize deterministic cloud auto-launch selection',
  )
  assert.match(
    policySource,
    /mode: 'explicit-host-required'/,
    'expected backend policy to refuse guessing when multiple saved SSH configs exist',
  )
  assert.match(
    policySource,
    /ct ssh-check --local[\s\S]*ct ssh <host> \[dir\]/,
    'expected backend policy to preserve the live-gate-first remote offload next step',
  )

}

run()

console.log('autowork backend policy selftest passed')
