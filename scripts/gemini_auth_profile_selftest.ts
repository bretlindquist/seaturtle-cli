import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  normalizeGeminiApiBaseUrl,
  resolveGeminiApiKeyAuthFromEnv,
} from '../source/src/services/authProfiles/geminiAuthCore.ts'

function testEnvResolution(): void {
  const auth = resolveGeminiApiKeyAuthFromEnv({
    GEMINI_API_KEY: 'gm-test',
    GEMINI_BASE_URL: 'https://example.com/v1beta/',
  } as NodeJS.ProcessEnv)

  assert.deepEqual(auth, {
    mode: 'api_key',
    source: 'GEMINI_API_KEY',
    apiKey: 'gm-test',
    baseUrl: 'https://example.com/v1beta',
  })

  assert.equal(
    normalizeGeminiApiBaseUrl(),
    'https://generativelanguage.googleapis.com/v1beta',
  )
}

function testRuntimeWiring(): void {
  const repoRoot = join(import.meta.dir, '..')
  const geminiTransport = readFileSync(
    join(repoRoot, 'source/src/services/api/gemini.ts'),
    'utf8',
  )
  const geminiImageGeneration = readFileSync(
    join(repoRoot, 'source/src/services/api/geminiImageGeneration.ts'),
    'utf8',
  )
  const geminiAuthHelper = readFileSync(
    join(repoRoot, 'source/src/services/authProfiles/geminiAuth.ts'),
    'utf8',
  )
  const geminiAuthCore = readFileSync(
    join(repoRoot, 'source/src/services/authProfiles/geminiAuthCore.ts'),
    'utf8',
  )

  assert.match(
    geminiAuthHelper,
    /saveGeminiApiKeyProfile/,
    'Gemini auth helper should expose a save path for CT-managed Gemini API-key profiles.',
  )
  assert.match(
    geminiAuthHelper,
    /clearGeminiApiKeyProfiles/,
    'Gemini auth helper should expose a clear path for CT-managed Gemini API-key profiles.',
  )
  assert.match(
    geminiTransport,
    /getResolvedGeminiApiKeyAuth/,
    'Gemini transport should resolve auth through the shared Gemini auth helper.',
  )
  assert.match(
    geminiAuthHelper,
    /resolveGeminiApiKeyAuthFromEnv/,
    'Gemini auth helper should compose the shared Gemini env/auth core.',
  )
  assert.match(
    geminiAuthCore,
    /normalizeGeminiApiBaseUrl/,
    'Gemini auth core should normalize Gemini base URLs in one place.',
  )
  assert.match(
    geminiImageGeneration,
    /getResolvedGeminiApiKeyAuth/,
    'Gemini image generation should resolve auth through the shared Gemini auth helper.',
  )
}

testEnvResolution()
testRuntimeWiring()

console.log('gemini auth profile self-test passed')
