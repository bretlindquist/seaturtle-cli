import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const hostedShellTool = readFileSync(
    join(repoRoot, 'source/src/tools/HostedShellTool/HostedShellTool.ts'),
    'utf8',
  )
  const tools = readFileSync(join(repoRoot, 'source/src/tools.ts'), 'utf8')

  assert.match(
    openAiCodex,
    /export async function runOpenAiCodexHostedShell/,
    'OpenAI adapter should expose a hosted shell helper',
  )
  assert.match(
    openAiCodex,
    /type: 'shell'/,
    'OpenAI hosted shell helper should call the hosted shell tool',
  )
  assert.match(
    openAiCodex,
    /type: 'container_auto'/,
    'OpenAI hosted shell helper should use an isolated container environment',
  )
  assert.match(
    hostedShellTool,
    /runtime\.supportsHostedShell/,
    'HostedShellTool should gate itself on hosted shell runtime support',
  )
  assert.match(
    tools,
    /HostedShellTool/,
    'HostedShellTool should be registered in the global tool list',
  )
}

run()

console.log('openai hosted shell routing self-test passed')
