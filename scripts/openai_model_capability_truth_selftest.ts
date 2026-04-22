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
    /const OPENAI_CODEX_MODEL_CAPABILITY_REGISTRY:/,
    'OpenAI capability truth should live in an explicit per-model registry instead of flattened model groups',
  )
  assert.match(
    openAiCodex,
    /'gpt-5\.4-nano': \{/,
    'OpenAI model capability truth should include GPT-5.4 Nano so SeaTurtle can expose the current lightweight GPT-5.4-class option',
  )
  assert.match(
    openAiCodex,
    /'gpt-5\.3-codex': \{\s*documented: NO_OPENAI_CODEX_MODEL_CAPABILITIES,\s*routed: NO_OPENAI_CODEX_MODEL_CAPABILITIES,/,
    'Codex-family models should not silently inherit GPT-5.4-class built-in tool support without current model-page evidence',
  )
  assert.match(
    openAiCodex,
    /'gpt-5\.4': \{\s*documented: OPENAI_DOCUMENTED_5_4_CAPABILITIES,\s*routed: OPENAI_ROUTED_5_4_FAMILY_CAPABILITIES,/,
    'GPT-5.4 should keep a distinct documented vs routed capability entry',
  )
  assert.match(
    openAiCodex,
    /'gpt-5\.4-mini': \{\s*documented: OPENAI_DOCUMENTED_5_4_MINI_CAPABILITIES,\s*routed: OPENAI_ROUTED_5_4_MINI_CAPABILITIES,/,
    'GPT-5.4 Mini should keep its own capability entry rather than inheriting a flattened frontier model truth',
  )
  assert.match(
    openAiCodex,
    /'gpt-5\.2': \{\s*documented: OPENAI_DOCUMENTED_5_2_CAPABILITIES,\s*routed: OPENAI_ROUTED_5_2_CAPABILITIES,/,
    'GPT-5.2 should keep an explicit conservative capability entry until refreshed against newer OpenAI model pages',
  )
  assert.match(
    openAiCodex,
    /export function getOpenAiCodexModelCapabilityRecord/,
    'OpenAI capability truth should expose a single record lookup used by both documented and routed capability helpers',
  )
  assert.match(
    openAiCodex,
    /return getOpenAiCodexModelCapabilityRecord\(model\)\.documented/,
    'documented capability lookup should resolve through the shared per-model capability record',
  )
  assert.match(
    openAiCodex,
    /return getOpenAiCodexModelCapabilityRecord\(model\)\.routed/,
    'routed capability lookup should resolve through the shared per-model capability record',
  )
  assert.match(
    providerRuntime,
    /const documentedModelCapabilities = getDocumentedOpenAiCodexModelCapabilities/,
    'provider runtime should derive status/auth model capability reporting from the documented capability map',
  )
  assert.match(
    providerRuntime,
    /const routedModelCapabilities = getRoutedOpenAiCodexModelCapabilities/,
    'provider runtime should derive routed OpenAI behavior from the SeaTurtle runtime capability map',
  )
}

run()

console.log('openai model capability truth self-test passed')
