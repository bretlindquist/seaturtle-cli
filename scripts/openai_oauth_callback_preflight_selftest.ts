import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const oauthSource = readFileSync(
    join(repoRoot, 'source/src/services/authProfiles/openaiCodexOAuth.ts'),
    'utf8',
  )

  assert.match(
    oauthSource,
    /const OPENAI_CODEX_CALLBACK_PORT = 1455/,
    'expected the OpenAI OAuth seam to centralize the fixed callback port in one authoritative constant',
  )

  assert.match(
    oauthSource,
    /export async function canBindOpenAiCodexCallbackPort\(/,
    'expected the OpenAI OAuth seam to expose a real callback-port preflight',
  )

  assert.match(
    oauthSource,
    /createServer\(\)/,
    'expected the callback-port preflight to verify bindability by opening a local server',
  )

  assert.match(
    oauthSource,
    /export async function resolveOpenAiCodexOAuthLoginPreparation\(/,
    'expected the OpenAI OAuth seam to resolve one login-preparation decision from the callback-port truth',
  )

  assert.match(
    oauthSource,
    /kind: 'import-existing-codex-cli'/,
    'expected OpenAI OAuth preflight to support adopting existing Codex CLI auth when the callback port is already owned',
  )

  assert.match(
    oauthSource,
    /Using the existing Codex CLI OAuth from ~\/\.codex\/auth\.json instead of starting a second browser flow\./,
    'expected the import fallback to explain why CT is not launching a second browser flow',
  )

  assert.match(
    oauthSource,
    /If you just ran codex login, go back and choose "Use existing Codex OAuth"\./,
    'expected the blocked-state message to point users at the correct recovery path after codex login',
  )

  assert.match(
    oauthSource,
    /const loginPreparation = await resolveOpenAiCodexOAuthLoginPreparation\(\)/,
    'expected native OpenAI login to consult the shared callback-port preflight before starting the OAuth helper',
  )

  assert.match(
    oauthSource,
    /if \(loginPreparation\.kind === 'import-existing-codex-cli'\)/,
    'expected native OpenAI login to route through the shared import-existing path when the callback port is occupied',
  )

  assert.match(
    oauthSource,
    /handlers\.onProgress\?\.\(loginPreparation\.message\)/,
    'expected startup auth UI to receive truthful progress messaging when CT adopts existing Codex CLI auth',
  )
}

run()

console.log('openai oauth callback preflight self-test passed')
