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
    /function hasActiveCloudOffload\(workflow: ReturnType<typeof peekActiveWorkstream>\): boolean/,
    'expected the autowork runner to centralize active cloud-offload detection from workflow state',
  )
  assert.match(
    runnerSource,
    /Autowork already has an active background cloud-offload run for this workstream\./,
    'expected concurrent local autowork attempts to fail with a truthful cloud-offload guard message',
  )
  assert.match(
    runnerSource,
    /if \(hasActiveCloudOffload\(workflow\)\) \{\s*return \{\s*ok: false,\s*message: getActiveCloudOffloadGuardMessage\(entryPoint\)/,
    'expected prepareAutoworkSafeExecution to refuse local execution while cloud offload is active',
  )
  assert.match(
    runnerSource,
    /if \(hasActiveCloudOffload\(peekActiveWorkstream\(context\.repoRoot\)\)\) \{\s*return \{\s*ok: false,\s*message: getActiveCloudOffloadGuardMessage\(entryPoint\)/,
    'expected verifyAutoworkSafeExecution to refuse local verification while cloud offload is active',
  )
}

run()

console.log('autowork cloud concurrency guard selftest passed')
