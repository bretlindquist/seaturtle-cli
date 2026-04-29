import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const promptSource = read(
    projectRoot,
    'source/src/services/SessionMemory/prompts.ts',
  )
  assert.match(
    promptSource,
    /workflowStateContext: string \| null = null/,
    'expected session memory prompt builder to accept optional workflow state context',
  )
  assert.match(
    promptSource,
    /AUTHORITATIVE WORKFLOW STATE:/,
    'expected session memory prompt builder to embed an authoritative workflow state block',
  )
  assert.match(
    promptSource,
    /treat it as the source of truth/,
    'expected session memory prompt builder to instruct the updater to honor workflow state',
  )

  const sessionMemorySource = read(
    projectRoot,
    'source/src/services/SessionMemory/sessionMemory.ts',
  )
  assert.match(
    sessionMemorySource,
    /function getWorkflowStateContextForSessionMemory/,
    'expected session memory extraction to gather workflow state context',
  )
  assert.match(
    sessionMemorySource,
    /readActiveWorkflowCompactionProjection\(getCtProjectRoot\(\)\)/,
    'expected session memory workflow context to be resolved from project identity root',
  )
  assert.match(
    sessionMemorySource,
    /buildSessionMemoryUpdatePrompt\(\s*currentMemory,\s*memoryPath,\s*workflowStateContext,\s*\)/,
    'expected session memory extraction to pass workflow state context into the prompt builder',
  )
}

run()

console.log('session memory workflow selftest passed')
