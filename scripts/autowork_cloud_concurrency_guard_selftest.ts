import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  const supervisionSource = read(
    projectRoot,
    'source/src/services/autowork/supervisionAuthority.ts',
  )

  assert.match(
    supervisionSource,
    /export async function inspectActiveSupervisedAutoworkRun/,
    'expected the autowork runner to centralize active cloud-offload detection through the shared supervision authority seam',
  )
  assert.match(
    supervisionSource,
    /Autowork already has an active background cloud-offload run for this workstream\./,
    'expected concurrent local autowork attempts to fail with a truthful cloud-offload guard message',
  )
  assert.match(
    runnerSource,
    /const activeSupervisedRun = await inspectActiveSupervisedAutoworkRun\(\s*context\.repoRoot,\s*\)\s*if \(activeSupervisedRun\) \{\s*return \{\s*ok: false,\s*message: getSupervisedAutoworkGuardMessage\(/s,
    'expected prepareAutoworkSafeExecution to refuse local execution while cloud offload is active',
  )
  assert.match(
    runnerSource,
    /export async function verifyAutoworkSafeExecution[\s\S]*const activeSupervisedRun = await inspectActiveSupervisedAutoworkRun\(\s*context\.repoRoot,\s*\)\s*if \(activeSupervisedRun\) \{\s*return \{\s*ok: false,\s*message: getSupervisedAutoworkGuardMessage\(/,
    'expected verifyAutoworkSafeExecution to refuse local verification while cloud offload is active',
  )
  assert.match(
    supervisionSource,
    /Autowork already has an active local-swarm lifecycle run for this workstream\./,
    'expected concurrent local autowork attempts to fail with a truthful local lifecycle swarm guard message',
  )
}

run()

console.log('autowork cloud concurrency guard selftest passed')
