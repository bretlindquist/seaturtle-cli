import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const logoutCommand = readFileSync(
    join(repoRoot, 'source/src/commands/logout/index.ts'),
    'utf8',
  )
  const logoutFlow = readFileSync(
    join(repoRoot, 'source/src/commands/logout/logout.tsx'),
    'utf8',
  )

  assert.match(
    logoutCommand,
    /Clear CT provider auth/,
    'Logout command copy should describe CT-managed provider auth generically.',
  )
  assert.match(
    logoutFlow,
    /type LogoutTarget = 'anthropic' \| 'openai-codex' \| 'gemini' \| 'all'/,
    'Logout flow should include Gemini as a first-class logout target.',
  )
  assert.match(
    logoutFlow,
    /performGeminiLogout/,
    'Logout flow should define a Gemini-specific logout path.',
  )
  assert.match(
    logoutFlow,
    /clearGeminiApiKeyProfiles/,
    'Logout flow should clear CT-managed Gemini API-key profiles.',
  )
  assert.match(
    logoutFlow,
    /Existing GEMINI_API_KEY environment config was left intact/,
    'Logout copy should be honest about leaving GEMINI_API_KEY env config untouched.',
  )
}

run()

console.log('logout provider surface self-test passed')
