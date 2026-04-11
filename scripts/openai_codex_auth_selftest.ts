import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  resolveOpenAiApiBaseUrl,
  resolveOpenAiCodexApiKeyAuthFromEnv,
} from '../source/src/services/authProfiles/openaiCodexAuthCore.ts'

function testEnvApiKeyResolution() {
  const auth = resolveOpenAiCodexApiKeyAuthFromEnv({
    OPENAI_API_KEY: 'sk-test',
    OPENAI_ORGANIZATION: 'org_123',
    OPENAI_PROJECT: 'proj_456',
    OPENAI_BASE_URL: 'https://example.com/v1/',
  } as NodeJS.ProcessEnv)

  assert.deepEqual(auth, {
    mode: 'api_key',
    source: 'OPENAI_API_KEY',
    apiKey: 'sk-test',
    organizationId: 'org_123',
    projectId: 'proj_456',
    baseUrl: 'https://example.com/v1',
  })
  assert.equal(resolveOpenAiApiBaseUrl({} as NodeJS.ProcessEnv), 'https://api.openai.com/v1')
}

function testRuntimeWiring() {
  const repoRoot = join(import.meta.dir, '..')
  const providerRuntime = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )
  const apiTransport = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )

  assert.match(
    providerRuntime,
    /openAiCodexApiKeyReady/,
    'provider runtime snapshot should expose API-key readiness explicitly',
  )
  assert.match(
    providerRuntime,
    /OPENAI_API_KEY/,
    'provider runtime should recognize OPENAI_API_KEY as an OpenAI auth source',
  )
  assert.match(
    apiTransport,
    /getResolvedOpenAiCodexAuth/,
    'OpenAI transport should resolve auth through the shared resolver',
  )
  assert.match(
    apiTransport,
    /OpenAI-Project/,
    'OpenAI transport should attach OpenAI project headers for API-key auth',
  )
}

testEnvApiKeyResolution()
testRuntimeWiring()

console.log('openai codex auth self-test passed')
