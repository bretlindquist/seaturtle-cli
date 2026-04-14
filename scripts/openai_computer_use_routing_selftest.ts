import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const toolFile = readFileSync(
    join(repoRoot, 'source/src/tools/ComputerUseTool/ComputerUseTool.ts'),
    'utf8',
  )
  const promptFile = readFileSync(
    join(repoRoot, 'source/src/tools/ComputerUseTool/prompt.ts'),
    'utf8',
  )
  const openAiAdapter = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const toolRegistry = readFileSync(
    join(repoRoot, 'source/src/tools.ts'),
    'utf8',
  )

  assert.match(
    toolFile,
    /runOpenAiCodexComputerUse/,
    'ComputerUseTool should route through the OpenAI computer-use helper',
  )
  assert.match(
    toolFile,
    /apps: z\s*\.\s*array/,
    'ComputerUseTool should require explicit target apps for access requests',
  )
  assert.match(
    promptFile,
    /provide the concrete target apps up front/i,
    'ComputerUse prompt should teach explicit app targeting',
  )
  assert.match(
    openAiAdapter,
    /type: 'computer'/,
    'OpenAI adapter should invoke the provider-hosted computer tool',
  )
  assert.match(
    openAiAdapter,
    /computer_call_output/,
    'OpenAI adapter should send computer_call_output follow-up turns',
  )
  assert.match(
    openAiAdapter,
    /dispatchComputerUseMcpToolRaw[\s\S]*request_access/,
    'OpenAI computer use should reuse the local permission flow before interaction',
  )
  assert.match(
    openAiAdapter,
    /cleanupComputerUseAfterTurn/,
    'OpenAI computer use should clean up the local computer-use session after the loop',
  )
  assert.match(
    toolRegistry,
    /ComputerUseTool/,
    'tool registry should expose the ComputerUse tool',
  )
}

run()

console.log('openai computer-use routing self-test passed')
