import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const registryFile = readFileSync(
  join(repoRoot, 'source/src/services/models/providerModelRegistry.ts'),
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
  registryFile,
  /export type ProviderModelRegistryEntry/,
  'provider model registry should define a typed curated registry entry shape',
)
assert.match(
  registryFile,
  /recommendedMainModel/,
  'provider model registry should expose a recommended main model per provider',
)
assert.match(
  registryFile,
  /selectableInModelPicker/,
  'provider model registry should distinguish picker-selectable models from internal provider-hosted models',
)
assert.match(
  registryFile,
  /discoverySupported: true/,
  'provider model registry snapshots should expose discovery support without claiming routed capability truth from upstream',
)
assert.match(
  statusFile,
  /Anthropic model registry/,
  'status should surface the curated Anthropic model registry summary',
)
assert.match(
  statusFile,
  /Codex model registry/,
  'status should surface the curated OpenAI\/Codex model registry summary',
)
assert.match(
  statusFile,
  /Gemini model registry/,
  'status should surface the curated Gemini model registry summary',
)
assert.match(
  authHandlerFile,
  /providerModelRegistry:/,
  'auth status json should expose provider model registry snapshots',
)

console.log('provider model registry self-test passed')
