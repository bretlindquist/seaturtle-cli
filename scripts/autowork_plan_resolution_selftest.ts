import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const stateSource = read(projectRoot, 'source/src/services/autowork/state.ts')
  assert.match(
    stateSource,
    /selectedPlanPath: string \| null/,
    'expected autowork state to persist an explicit selectedPlanPath',
  )

  const resolutionSource = read(
    projectRoot,
    'source/src/services/autowork/planResolution.ts',
  )
  assert.match(
    resolutionSource,
    /resolveExplicitAutoworkPlanPath/,
    'expected explicit autowork plan path resolution helper to exist',
  )
  assert.match(
    resolutionSource,
    /source: 'selected-path'/,
    'expected resolver to expose a selected-path source mode',
  )
  assert.match(
    resolutionSource,
    /code:\s*'stale_selected_plan'/,
    'expected resolver to fail clearly when the selected plan path goes stale',
  )

  const commandSource = read(
    projectRoot,
    'source/src/commands/autowork/autowork.tsx',
  )
  assert.match(
    commandSource,
    /splitCommandArgs/,
    'expected autowork command parsing to preserve the path tail for use <path>',
  )
  assert.match(
    commandSource,
    /selectAutoworkPlan/,
    'expected autowork command surface to include explicit plan selection',
  )
  assert.match(
    commandSource,
    /use <path>/,
    'expected autowork help to advertise the explicit plan selector',
  )
  assert.match(
    commandSource,
    /selectedPlanPath: selected\.planPath/,
    'expected explicit plan selection to persist selectedPlanPath',
  )

  const readmeSource = read(projectRoot, 'README.md')
  assert.match(
    readmeSource,
    /\/autowork use <path>/,
    'expected README to document the explicit autowork plan selector',
  )

  const featuresRouterSource = read(projectRoot, 'docs/FEATURES-ROUTER.md')
  assert.match(
    featuresRouterSource,
    /\/autowork use <path>/,
    'expected features router docs to mention the explicit plan selector',
  )
}

run()

console.log('autowork plan resolution selftest passed')
