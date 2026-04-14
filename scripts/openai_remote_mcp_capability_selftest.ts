import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const providerRuntime = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )
  const capabilityConfig = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCapabilityConfig.ts'),
    'utf8',
  )
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )

  assert.match(
    providerRuntime,
    /remoteMcpConfigured && routedModelCapabilities\.supportsMcp/,
    'provider runtime should derive OpenAI remote MCP from eligible configured servers plus the routed OpenAI capability map',
  )
  assert.match(
    capabilityConfig,
    /config\.type !== 'http' && config\.type !== 'sse'/,
    'OpenAI remote MCP config should only admit HTTP or SSE MCP servers',
  )
  assert.match(
    capabilityConfig,
    /config\.headersHelper \|\| config\.oauth/,
    'OpenAI remote MCP config should reject unsupported helper-auth and oauth-only server configs',
  )
  assert.match(
    capabilityConfig,
    /config\.headers && Object\.keys\(config\.headers\)\.length > 0/,
    'OpenAI remote MCP config should reject arbitrary custom header configs until they are explicitly mapped',
  )
  assert.match(
    openAiCodex,
    /type:\s*'mcp'/,
    'OpenAI runtime should emit provider-hosted MCP tools when compatible remote MCP servers are configured',
  )
  assert.match(
    openAiCodex,
    /require_approval:\s*'never'/,
    'OpenAI remote MCP bridge should explicitly opt into never-approval mode until SeaTurtle wires the approval response loop',
  )
  assert.match(
    openAiCodex,
    /allowed_tools:\s*\[\.\.\.allowedTools\]\.sort\(\)/,
    'OpenAI remote MCP bridge should limit imported remote tools to the exact SeaTurtle-allowed MCP tool names for that server',
  )
}

run()

console.log('openai remote MCP capability self-test passed')
