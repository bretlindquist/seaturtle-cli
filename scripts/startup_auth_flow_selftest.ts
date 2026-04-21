import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const startupAuthFlow = readFileSync(
    join(repoRoot, 'source/src/components/StartupAuthFlow.tsx'),
    'utf8',
  )
  const loginCommand = readFileSync(
    join(repoRoot, 'source/src/commands/login/index.ts'),
    'utf8',
  )

  assert.match(
    startupAuthFlow,
    /state: 'gemini-options'/,
    'Startup auth flow should define a Gemini options screen.',
  )
  assert.match(
    startupAuthFlow,
    /state: 'gemini-api-key'/,
    'Startup auth flow should define a Gemini API-key entry screen.',
  )
  assert.match(
    startupAuthFlow,
    /saveGeminiApiKeyProfile/,
    'Startup auth flow should save Gemini API keys through the shared helper seam.',
  )
  assert.match(
    startupAuthFlow,
    /persistPreferredMainProvider\('gemini'\)/,
    'Startup auth flow should switch the preferred main provider to Gemini.',
  )
  assert.match(
    startupAuthFlow,
    /Use existing Gemini env key/,
    'Startup auth flow should acknowledge existing GEMINI_API_KEY auth when present.',
  )
  assert.match(
    startupAuthFlow,
    /PRODUCT_GEMINI_API_KEY_URL/,
    'Startup auth flow should link users to the Gemini API key setup page.',
  )
  assert.match(
    startupAuthFlow,
    /1\. Sign in to Google AI Studio\./,
    'Startup auth flow should explain the first Gemini API key setup step.',
  )
  assert.match(
    startupAuthFlow,
    /2\. Create or copy a Gemini API key\./,
    'Startup auth flow should explain how to obtain a Gemini API key.',
  )
  assert.match(
    startupAuthFlow,
    /3\. Paste it here and press Enter\./,
    'Startup auth flow should explain how to finish Gemini API key setup.',
  )
  assert.match(
    startupAuthFlow,
    /Gemini API key ·/,
    'Startup auth flow should expose Gemini in the provider picker.',
  )
  assert.match(
    loginCommand,
    /Set up or switch CT provider auth/,
    'Login command copy should match the broader provider setup surface.',
  )
}

run()

console.log('startup auth flow self-test passed')
