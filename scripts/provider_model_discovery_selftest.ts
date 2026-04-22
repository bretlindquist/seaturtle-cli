import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const discoveryFile = readFileSync(
  join(repoRoot, 'source/src/services/models/providerModelDiscovery.ts'),
  'utf8',
)
const statusFile = readFileSync(
  join(repoRoot, 'source/src/utils/status.tsx'),
  'utf8',
)
const authHandlerFile = readFileSync(
  join(repoRoot, 'source/src/cli/handlers/auth.ts'),
  'utf8',
)

assert.match(
  discoveryFile,
  /path: '\/v1\/models'/,
  'discovery should use the official /v1/models endpoint for Anthropic and OpenAI',
)
assert.match(
  discoveryFile,
  /path: '\/v1beta\/models'/,
  'discovery should use the official /v1beta/models endpoint for Gemini',
)
assert.match(
  discoveryFile,
  /parseOpenAiModelDiscoveryResponse/,
  'discovery should provide an OpenAI model-list parser',
)
assert.match(
  discoveryFile,
  /parseAnthropicModelDiscoveryResponse/,
  'discovery should provide an Anthropic model-list parser',
)
assert.match(
  discoveryFile,
  /parseGeminiModelDiscoveryResponse/,
  'discovery should provide a Gemini model-list parser',
)
assert.match(
  discoveryFile,
  /provider === 'openai-codex'/,
  'discovery snapshots should special-case OpenAI model refresh when the current auth source cannot call the official model-list endpoint',
)
assert.match(
  discoveryFile,
  /api-key-required/,
  'discovery snapshots should expose an explicit API-key-required status for OpenAI model refresh',
)
assert.match(
  discoveryFile,
  /refreshStatus,/,
  'discovery snapshots should derive refresh status explicitly instead of assuming every auth source can refresh upstream model lists',
)
assert.match(
  statusFile,
  /Codex model discovery/,
  'status should surface OpenAI/Codex model discovery readiness',
)
assert.match(
  statusFile,
  /requires OpenAI API key auth/,
  'status should explain when OpenAI upstream model discovery requires API-key auth instead of pretending OAuth can refresh the official model endpoint',
)
assert.match(
  statusFile,
  /Gemini model discovery/,
  'status should surface Gemini model discovery readiness',
)
assert.match(
  authHandlerFile,
  /providerModelDiscovery:/,
  'auth status json should expose provider model discovery snapshots',
)

console.log('provider model discovery self-test passed')
