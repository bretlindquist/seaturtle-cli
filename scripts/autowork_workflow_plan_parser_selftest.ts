import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const parserSource = read(
    projectRoot,
    'source/src/services/autowork/planParser.ts',
  )
  assert.match(
    parserSource,
    /peekActiveWorkstream/,
    'expected autowork plan parsing to consult active workflow state before reparsing the file',
  )
  assert.match(
    parserSource,
    /function getWorkflowBackedPlanChunks/,
    'expected autowork plan parsing to expose a workflow-backed chunk resolution path',
  )
  assert.match(
    parserSource,
    /workflow\.resolution\.hasExecutablePlan/,
    'expected workflow-backed parsing to require an executable workflow plan',
  )
  assert.match(
    parserSource,
    /resolve\(candidate\) === resolvedPath/,
    'expected workflow-backed parsing to match the active promoted plan path',
  )
  assert.match(
    parserSource,
    /const workflowChunks = getWorkflowBackedPlanChunks\(repoRoot, resolvedPath\)/,
    'expected parseAutoworkPlanFile to prefer workflow-backed chunks when available',
  )
}

run()

console.log('autowork workflow plan parser selftest passed')
