import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const openAiCodex = readFileSync(
  join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
  'utf8',
)
const effortFile = readFileSync(
  join(repoRoot, 'source/src/utils/effort.ts'),
  'utf8',
)

assert.match(
  openAiCodex,
  /const OPENAI_CODEX_OAUTH_ONLY_MODEL_DEFINITIONS = \[/,
  'OpenAI Codex model truth should separate OAuth-only picker models from the shared API-key-safe list',
)
assert.match(
  openAiCodex,
  /value: 'gpt-5\.5'/,
  'OpenAI Codex OAuth picker truth should include GPT-5.5',
)
assert.match(
  openAiCodex,
  /getDefaultOpenAiCodexApiKeyProfile\(\) \|\|[\s\S]*process\.env\.OPENAI_API_KEY\?\.trim\(\)/,
  'OpenAI model catalog scope should hide OAuth-only models when API-key auth is active',
)
assert.match(
  openAiCodex,
  /if \(scope === 'api_key'\) \{\s*return OPENAI_CODEX_SHARED_MODEL_DEFINITIONS/s,
  'OpenAI API-key model catalogs should stay on the shared API-key-safe list',
)
assert.match(
  openAiCodex,
  /return \[\s*\.\.\.OPENAI_CODEX_OAUTH_ONLY_MODEL_DEFINITIONS,\s*\.\.\.OPENAI_CODEX_SHARED_MODEL_DEFINITIONS,/s,
  'OpenAI OAuth model catalogs should prepend GPT-5.5 ahead of the shared model list',
)
assert.match(
  effortFile,
  /'gpt-5\.5'/,
  'OpenAI effort handling should include GPT-5.5 so the picker and /effort stay coherent',
)

console.log('openai oauth model picker self-test passed')
