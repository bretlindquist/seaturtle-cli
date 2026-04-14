import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const providerRuntime = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )

  assert.match(
    openAiCodex,
    /export function getDocumentedOpenAiCodexModelCapabilities/,
    'OpenAI model capability code should expose a documented capability map separately from routed capability support',
  )
  assert.match(
    openAiCodex,
    /export function getRoutedOpenAiCodexModelCapabilities/,
    'OpenAI model capability code should expose a routed capability map for SeaTurtle runtime support',
  )
  assert.match(
    openAiCodex,
    /const FULL_OPENAI_TOOLSTACK_MODELS = new Set\(\['gpt-5\.4', 'gpt-5\.4-mini'\]\)/,
    'the fully documented OpenAI toolstack should currently be limited to the models explicitly documented at that level',
  )
  assert.match(
    openAiCodex,
    /const CODEX_FAMILY_MODELS = new Set\(\[[\s\S]*'gpt-5\.3-codex'[\s\S]*'gpt-5\.2-codex'[\s\S]*'gpt-5\.1-codex-max'[\s\S]*'gpt-5\.1-codex-mini'[\s\S]*\]\)/,
    'legacy Codex-family models should remain recognized separately from the fully documented frontier models',
  )
  assert.match(
    providerRuntime,
    /const routedModelCapabilities = getRoutedOpenAiCodexModelCapabilities/,
    'provider runtime should derive routed OpenAI behavior from the SeaTurtle runtime capability map',
  )
  assert.match(
    providerRuntime,
    /const documentedModelCapabilities = getDocumentedOpenAiCodexModelCapabilities/,
    'provider runtime should derive status\/auth model capability reporting from the documented capability map',
  )
}

run()

console.log('openai model capability truth self-test passed')
