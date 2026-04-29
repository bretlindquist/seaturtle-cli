import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const modeSelectionSource = read(
    projectRoot,
    'source/src/services/autowork/modeSelection.ts',
  )
  assert.match(
    modeSelectionSource,
    /function selectWorkflowGatedMode/,
    'expected autowork mode selection to gate on workflow resolution before chunk execution logic',
  )
  assert.match(
    modeSelectionSource,
    /autoworkEligibilityHint/,
    'expected autowork mode selection to inspect workflow autowork eligibility hints',
  )
  assert.match(
    modeSelectionSource,
    /case 'research-needed':[\s\S]*mode: 'research'/,
    'expected workflow research-needed state to route autowork into research mode',
  )
  assert.match(
    modeSelectionSource,
    /case 'plan-needed':[\s\S]*mode: 'plan-hardening'/,
    'expected workflow plan-needed state to route autowork into plan-hardening mode',
  )
  assert.match(
    modeSelectionSource,
    /case 'review-needed':[\s\S]*mode: 'audit-and-polish'/,
    'expected workflow review-needed state to route autowork into audit-and-polish mode',
  )

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /workflowResolution: WorkflowResolution \| null/,
    'expected autowork startup context to carry workflow resolution',
  )
  assert.match(
    runnerSource,
    /peekActiveWorkstream\(repoRoot\)/,
    'expected autowork startup inspection to consult the active workflow packet state',
  )
  assert.match(
    runnerSource,
    /selectAutoworkMode\(\s*inspection,\s*state,\s*parsedPlan,\s*workflow\?\.resolution \?\? null,\s*\)/,
    'expected autowork mode selection to consume workflow resolution directly',
  )

  const inspectionSource = read(
    projectRoot,
    'source/src/services/autowork/inspectionSummary.ts',
  )
  const commandSource = read(
    projectRoot,
    'source/src/commands/autowork/autowork.tsx',
  )
  assert.match(
    inspectionSource,
    /formatWorkflowEligibilityHint/,
    'expected autowork command output to name workflow readiness clearly',
  )
  assert.match(
    inspectionSource,
    /Workflow phase:/,
    'expected autowork status surfaces to show workflow phase',
  )
  assert.match(
    inspectionSource,
    /Workflow readiness:/,
    'expected autowork status surfaces to show workflow readiness',
  )
}

run()

console.log('autowork workflow phase selftest passed')
