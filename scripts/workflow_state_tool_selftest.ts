import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const toolSource = read(
    projectRoot,
    'source/src/tools/WorkflowStateTool/WorkflowStateTool.ts',
  )
  assert.match(
    toolSource,
    /name: WORKFLOW_STATE_TOOL_NAME/,
    'expected workflow state tool to declare the canonical tool name',
  )
  assert.match(
    toolSource,
    /syncPlanFromFilePath/,
    'expected workflow state tool to support syncing the workflow plan packet from a tracked plan file',
  )
  assert.match(
    toolSource,
    /setActiveWorkstreamPhase/,
    'expected workflow state tool to support structured phase updates',
  )
  assert.match(
    toolSource,
    /updateWorkResearchPacket/,
    'expected workflow state tool to update research packet state directly',
  )

  const toolsSource = read(projectRoot, 'source/src/tools.ts')
  assert.match(
    toolsSource,
    /WorkflowStateTool/,
    'expected workflow state tool to be registered in the base tool list',
  )

  const constantsSource = read(projectRoot, 'source/src/constants/tools.ts')
  assert.match(
    constantsSource,
    /WORKFLOW_STATE_TOOL_NAME/,
    'expected workflow state tool to be named in the centralized tool constants surface',
  )
  assert.match(
    constantsSource,
    /ASYNC_AGENT_ALLOWED_TOOLS[\s\S]*WORKFLOW_STATE_TOOL_NAME/,
    'expected workflow state tool to be available to async agents for future orchestration paths',
  )

  const runnerSource = read(projectRoot, 'source/src/services/autowork/runner.ts')
  assert.match(
    runnerSource,
    /Use \$\{WORKFLOW_STATE_TOOL_NAME\} for workflow packet updates/,
    'expected autowork lifecycle prompts to direct the model to the structured workflow state tool',
  )
}

run()

console.log('workflow state tool selftest passed')
