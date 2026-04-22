import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const toolFile = readFileSync(
    join(repoRoot, 'source/src/tools/CodeInterpreterTool/CodeInterpreterTool.ts'),
    'utf8',
  )
  const promptFile = readFileSync(
    join(repoRoot, 'source/src/tools/CodeInterpreterTool/prompt.ts'),
    'utf8',
  )
  const tools = readFileSync(join(repoRoot, 'source/src/tools.ts'), 'utf8')
  const providerRuntime = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )

  assert.match(
    openAiCodex,
    /export async function runOpenAiCodexCodeInterpreter/,
    'OpenAI adapter should expose a hosted code-interpreter helper',
  )
  assert.match(
    openAiCodex,
    /type: 'code_interpreter'/,
    'OpenAI code-interpreter helper should call the hosted code_interpreter tool',
  )
  assert.match(
    openAiCodex,
    /container: \{ type: 'auto', memory_limit: '4g' \}/,
    'OpenAI code-interpreter helper should request an auto container with an explicit memory tier',
  )
  assert.match(
    openAiCodex,
    /tool_choice: 'required'/,
    'OpenAI code-interpreter helper should require the hosted tool instead of hoping the model chooses it',
  )
  assert.match(
    openAiCodex,
    /collectCodeInterpreterContainerId/,
    'OpenAI code-interpreter helper should recover the hosted container id from the response payload',
  )
  assert.match(
    openAiCodex,
    /collectCodeInterpreterFiles/,
    'OpenAI code-interpreter helper should recover generated hosted files from response annotations',
  )
  assert.match(
    toolFile,
    /runtime\.routedOpenAiModelCapabilities\.includes\('code interpreter'\)/,
    'CodeInterpreterTool should gate itself on routed OpenAI code-interpreter support',
  )
  assert.match(
    toolFile,
    /runOpenAiCodexCodeInterpreter/,
    'CodeInterpreterTool should route through the OpenAI hosted code-interpreter helper',
  )
  assert.match(
    promptFile,
    /OpenAI's hosted code interpreter sandbox/,
    'CodeInterpreter prompt should describe the hosted sandbox clearly',
  )
  assert.match(
    tools,
    /CodeInterpreterTool/,
    'tool registry should expose the CodeInterpreter tool',
  )
  assert.match(
    providerRuntime,
    /supportsCodeInterpreter/,
    'provider runtime should expose code-interpreter capability truth explicitly',
  )
}

run()

console.log('openai code interpreter routing self-test passed')
