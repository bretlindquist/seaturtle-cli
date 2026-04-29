import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const workflowStateSource = read(
    projectRoot,
    'source/src/services/projectIdentity/workflowState.ts',
  )

  assert.match(
    workflowStateSource,
    /export type WorkflowHandoffPacket =/,
    'expected workflow state to declare a first-class workflow handoff packet type',
  )
  assert.match(
    workflowStateSource,
    /export function readActiveWorkflowHandoffPacket/,
    'expected workflow state to expose a read helper for the active workflow handoff packet',
  )
  assert.match(
    workflowStateSource,
    /export function importWorkflowHandoffPacket/,
    'expected workflow state to expose an import helper for workflow handoff packets',
  )
  assert.match(
    workflowStateSource,
    /summaryLines: buildWorkflowCompactionSummaryLines/,
    'expected workflow handoff packets to carry the compact workflow summary lines',
  )

  const toolSource = read(
    projectRoot,
    'source/src/tools/WorkflowStateTool/WorkflowStateTool.ts',
  )
  assert.match(
    toolSource,
    /bootstrap: z/,
    'expected workflow state tool to support bootstrap input',
  )
  assert.match(
    toolSource,
    /importWorkflowHandoffPacket/,
    'expected workflow state tool bootstrap to import the handoff packet through the workflow-state seam',
  )
  assert.match(
    toolSource,
    /archiveActiveWorkstream/,
    'expected workflow state tool bootstrap to replace active workstreams explicitly instead of silently overwriting them',
  )
}

run()

console.log('workflow handoff selftest passed')
