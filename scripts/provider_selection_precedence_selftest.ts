import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const providers = readFileSync(
  join(repoRoot, 'source/src/utils/model/providers.ts'),
  'utf8',
)

assert.match(
  providers,
  /getSeaTurtleMainProviderEnv\(\)\s*\?\?\s*getSeaTurtleBooleanProviderEnv\(\)\s*\?\?\s*getConfiguredMainProvider\(\)\s*\?\?\s*getLegacyMainProviderEnv\(\)\s*\?\?\s*getLegacyBooleanProviderEnv\(\)/,
  'provider precedence should be SeaTurtle main env, SeaTurtle boolean env, persisted config, legacy main env, then legacy boolean env',
)

assert.match(
  providers,
  /return getPreferredMainRuntimeProvider\(\) === 'openai-codex'/,
  'OpenAI/Codex provider gate should follow the single preferred runtime decision',
)

assert.match(
  providers,
  /return getPreferredMainRuntimeProvider\(\) === 'gemini'/,
  'Gemini provider gate should follow the single preferred runtime decision',
)

console.log('provider selection precedence self-test passed')
