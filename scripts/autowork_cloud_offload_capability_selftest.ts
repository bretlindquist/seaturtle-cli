import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const capabilitySource = read(
    projectRoot,
    'source/src/services/autowork/cloudOffloadCapability.ts',
  )

  assert.match(
    capabilitySource,
    /status: 'active'/,
    'expected the cloud capability seam to represent an active ct ssh offload state',
  )
  assert.match(
    capabilitySource,
    /Remote-host offload is available via ct ssh/,
    'expected the cloud capability seam to anchor available-state truth in the ct ssh path',
  )
  assert.match(
    capabilitySource,
    /runtime\.provider === 'openai-codex' \|\| runtime\.provider === 'gemini'/,
    'expected the cloud capability seam to truthfully constrain provider-managed remote-host support to OpenAI/Codex and Gemini',
  )
  assert.match(
    capabilitySource,
    /getRemoteHostOffloadBuildReadiness/,
    'expected the cloud capability seam to consume the SSH build-readiness source of truth',
  )

  const sshSource = read(projectRoot, 'source/src/ssh/createSSHSession.ts')
  assert.match(
    sshSource,
    /export function getRemoteHostOffloadBuildReadiness/,
    'expected the SSH runtime seam to expose build readiness for remote-host offload consumers',
  )
}

run()

console.log('autowork cloud offload capability selftest passed')
