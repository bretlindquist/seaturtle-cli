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
    /inspectAndSelectAutoworkMode\(\s*planPath: string \| null/s,
    'expected autowork startup inspection to allow lifecycle entry without an executable plan path',
  )
  assert.match(
    runnerSource,
    /No active workstream exists yet\. Autowork should capture intent before research or planning\./,
    'expected autowork to bootstrap into discovery when no active workstream exists yet',
  )
  assert.match(
    runnerSource,
    /Plan file: \$\{planPath \?\? 'none yet'\}/,
    'expected lifecycle prompts to render a truthful no-plan-yet state',
  )
  assert.match(
    runnerSource,
    /ensureAutoworkLifecycleWorkstream/,
    'expected lifecycle entry to bootstrap an authoritative active workstream container before workflow updates',
  )

  const commandSource = read(projectRoot, 'source/src/commands/autowork/autowork.tsx')
  assert.match(
    commandSource,
    /inspectAndSelectAutoworkMode\(null\)/,
    'expected /autowork context loading to fall back to workflow bootstrap when no plan file resolves',
  )
  assert.match(
    commandSource,
    /workflow bootstrap/,
    'expected autowork status surfaces to report workflow-bootstrap plan sourcing truthfully',
  )
}

run()

console.log('autowork workflow bootstrap selftest passed')
