import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const capabilityConfig = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCapabilityConfig.ts'),
    'utf8',
  )
  const providerRuntime = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )
  const authHandler = readFileSync(
    join(repoRoot, 'source/src/cli/handlers/auth.ts'),
    'utf8',
  )
  const statusView = readFileSync(
    join(repoRoot, 'source/src/utils/status.tsx'),
    'utf8',
  )

  assert.match(
    capabilityConfig,
    /SEATURTLE_OPENAI_VECTOR_STORE_IDS/,
    'OpenAI capability config should support SeaTurtle vector-store configuration',
  )
  assert.match(
    capabilityConfig,
    /CLAUDE_CODE_OPENAI_VECTOR_STORE_IDS/,
    'OpenAI capability config should preserve the legacy vector-store alias',
  )
  assert.match(
    providerRuntime,
    /hostedFileSearchConfigured &&\s+routedModelCapabilities\.supportsFileSearch/,
    'provider runtime should only expose hosted file search when vector stores are configured and the routed OpenAI model capability map supports it',
  )
  assert.match(
    providerRuntime,
    /hostedFileSearchConfigured: boolean/,
    'provider runtime should track hosted file-search configuration separately from routed support',
  )
  assert.match(
    authHandler,
    /openAiCodexCapabilityConfig/,
    'auth status JSON should expose OpenAI capability configuration detail',
  )
  assert.match(
    authHandler,
    /hostedFileSearchRouted/,
    'auth status JSON should distinguish configured file search from routed file search',
  )
  assert.match(
    statusView,
    /Routed \(|runtime path pending/,
    'status should distinguish between routed hosted file search and configured-but-pending file search',
  )
}

run()

console.log('openai file search capability self-test passed')
