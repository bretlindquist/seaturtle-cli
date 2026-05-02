import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const runEntryAuthoritySource = read(
    projectRoot,
    'source/src/services/autowork/runEntryAuthority.ts',
  )
  assert.match(
    runEntryAuthoritySource,
    /export async function resolveAutoworkRunEntryAuthority/,
    'expected autowork to define one shared run-entry authority seam',
  )
  assert.match(
    runEntryAuthoritySource,
    /resolveActiveAutoworkPlanFile/,
    'expected the shared run-entry authority to consult tracked plan resolution first',
  )
  assert.match(
    runEntryAuthoritySource,
    /shouldStop:/,
    'expected the shared run-entry authority to classify whether a blocking refusal should stop the active contract',
  )
  assert.match(
    runEntryAuthoritySource,
    /resolveRelatedStaleAuthorityClears/,
    'expected the shared run-entry authority to clear the whole stale authority chain, not just the first failing plan pointer',
  )
  assert.match(
    runEntryAuthoritySource,
    /workflowPlanPath === state\.selectedPlanPath/,
    'expected stale selected-plan handling to clear matching workflow plan authority too',
  )

  const continuationSource = read(
    projectRoot,
    'source/src/services/autowork/continuationAuthority.ts',
  )
  assert.match(
    continuationSource,
    /resolveAutoworkRunEntryAuthority\(/,
    'expected autowork continuation to reuse the shared run-entry authority',
  )
  assert.doesNotMatch(
    continuationSource,
    /const planPath = state\.sourcePlanPath \?\? state\.selectedPlanPath \?\? null/,
    'expected continuation to stop deriving run eligibility from stale plan-path state alone',
  )

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /export function stopAutoworkContract\(/,
    'expected autowork to expose a shared persisted stop helper for operator and refusal paths',
  )
  assert.match(
    runnerSource,
    /currentMode: 'idle'/,
    'expected the shared stop helper to drive autowork back into idle mode',
  )

  const commandSource = read(
    projectRoot,
    'source/src/commands/autowork/autowork.tsx',
  )
  assert.match(
    commandSource,
    /head === 'stop' \|\| head === 'off'/,
    'expected /autowork to expose an explicit stop/off command path',
  )
  assert.match(
    commandSource,
    /head === 'unpin'/,
    'expected /autowork to expose an explicit unpin path',
  )
  assert.match(
    commandSource,
    /if \(entry\.shouldStop && entry\.repoRoot\)/,
    'expected blocking run-entry refusals to transition the active autowork contract into a stopped state',
  )
  assert.match(
    commandSource,
    /clearSelectedPlan: entry\.clearSelectedPlan/,
    'expected stale selected-plan refusals to clear pinned selected-plan authority through the stop seam',
  )
}

run()

console.log('autowork v1 stability selftest passed')
