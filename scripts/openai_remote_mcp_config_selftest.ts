import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const capabilityConfig = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCapabilityConfig.ts'),
    'utf8',
  )

  assert.match(
    capabilityConfig,
    /export function isOpenAiRemoteMcpCompatibleServerConfig/,
    'OpenAI capability config should expose a single remote-MCP compatibility predicate',
  )
  assert.match(
    capabilityConfig,
    /config\.type !== 'http' && config\.type !== 'sse'/,
    'OpenAI remote MCP compatibility should admit only HTTP and SSE transports',
  )
  assert.match(
    capabilityConfig,
    /config\.headersHelper \|\| config\.oauth/,
    'OpenAI remote MCP compatibility should reject helper-auth and oauth-managed MCP configs',
  )
  assert.match(
    capabilityConfig,
    /config\.headers && Object\.keys\(config\.headers\)\.length > 0/,
    'OpenAI remote MCP compatibility should reject arbitrary custom header configs',
  )
  assert.match(
    capabilityConfig,
    /isRestrictedToPluginOnly\('mcp'\)/,
    'OpenAI remote MCP discovery should respect plugin-only MCP policy',
  )
}

run()

console.log('openai remote MCP config self-test passed')
