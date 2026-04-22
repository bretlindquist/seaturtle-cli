import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const auditFile = readFileSync(
  join(repoRoot, 'scripts/openai_model_discovery_audit.ts'),
  'utf8',
)
const openAiCodex = readFileSync(
  join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
  'utf8',
)

assert.match(
  auditFile,
  /getResolvedOpenAiCodexAuth/,
  'OpenAI model discovery audit should resolve the active OpenAI auth source instead of assuming a global API key',
)
assert.match(
  auditFile,
  /auth\.mode !== 'api_key'/,
  'OpenAI model discovery audit should reject OAuth-only contexts honestly when the official model-list endpoint is not available there',
)
assert.match(
  auditFile,
  /parseOpenAiModelDiscoveryResponse/,
  'OpenAI model discovery audit should parse upstream model lists through the shared provider discovery parser',
)
assert.match(
  auditFile,
  /isOpenAiCodexMainLoopCandidate/,
  'OpenAI model discovery audit should filter upstream models down to main-loop candidates before comparing them against the curated registry',
)
assert.match(
  auditFile,
  /Curated OpenAI model registry matches current upstream candidates\./,
  'OpenAI model discovery audit should report a clean match explicitly when no registry drift is found',
)
assert.match(
  openAiCodex,
  /full routed OpenAI hosted-tool set/,
  'OpenAI model picker descriptions should explain the major routed hosted-tool distinction for GPT-5.4',
)
assert.match(
  openAiCodex,
  /without routed OpenAI hosted tools in this build/,
  'OpenAI compatibility-model descriptions should explain when provider-hosted tool routing is intentionally unavailable',
)

console.log('openai model discovery audit self-test passed')
