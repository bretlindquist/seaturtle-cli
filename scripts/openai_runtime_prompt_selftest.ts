import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const prompts = readFileSync(
    join(repoRoot, 'source/src/constants/prompts.ts'),
    'utf8',
  )

  assert.match(
    prompts,
    /When the active runtime is OpenAI\/Codex, SeaTurtle may have provider-routed web search, hosted file search, hosted shell, image generation, computer use, and remote MCP in addition to local tools\./,
    'expected the system prompt to teach CT about the shipped OpenAI runtime surface',
  )
  assert.match(
    prompts,
    /prefer the local command first, then point to docs\/FEATURES-ROUTER\.md or docs\/OPENAI-CODEX\.md/,
    'expected the system prompt to steer CT toward the local docs router when users ask for feature guidance',
  )
}

run()

console.log('openai runtime prompt self-test passed')
