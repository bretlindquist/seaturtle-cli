import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const mainSource = read(projectRoot, 'source/src/main.tsx')

  assert.match(
    mainSource,
    /--workflow-handoff-file <file>/,
    'expected the main CLI surface to expose a hidden workflow handoff import flag',
  )
  assert.match(
    mainSource,
    /--replace-workflow-handoff/,
    'expected the main CLI surface to expose an explicit replace flag for startup handoff imports',
  )
  assert.match(
    mainSource,
    /importWorkflowHandoffPacket/,
    'expected startup handoff imports to use the centralized workflow-state import seam',
  )
  assert.match(
    mainSource,
    /archiveActiveWorkstream\([\s\S]*Replaced by startup workflow handoff import\./,
    'expected startup handoff replacement to archive the previous active workstream explicitly',
  )
}

run()

console.log('workflow handoff startup selftest passed')
