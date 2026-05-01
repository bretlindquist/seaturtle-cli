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
    /type AutoworkLifecycleMode = Extract</,
    'expected autowork runner to define explicit lifecycle modes beyond execution',
  )
  assert.match(
    runnerSource,
    /function buildAutoworkLifecyclePrompt/,
    'expected autowork runner to build lifecycle prompts for non-execution waves',
  )
  assert.match(
    runnerSource,
    /Authoritative workflow packet files:/,
    'expected lifecycle prompts to point at authoritative workflow packet files',
  )
  assert.match(
    runnerSource,
    /syncAutoworkLifecycleModeStarted/,
    'expected autowork runner to project lifecycle-wave state into the workflow heartbeat',
  )
  assert.match(
    runnerSource,
    /function isLifecycleMode\(mode: AutoworkMode\): mode is AutoworkLifecycleMode/,
    'expected prepareAutoworkSafeExecution to actively handle non-execution autowork lifecycle modes',
  )
  assert.match(
    runnerSource,
    /SeaTurtle will reassess the workflow state and continue with \$\{nextStep\}/,
    'expected lifecycle prompts to describe persisted reassessment instead of raw queued-command chaining',
  )

  const inspectionSource = read(
    projectRoot,
    'source/src/services/autowork/inspectionSummary.ts',
  )
  assert.match(
    inspectionSource,
    /continue the current \$\{context\.mode\} wave from workflow state/,
    'expected autowork status messaging to explain the lifecycle-wave continuation path',
  )
}

run()

console.log('autowork lifecycle run selftest passed')
