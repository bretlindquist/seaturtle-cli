import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const providerRuntime = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )
  const swarmGate = readFileSync(
    join(repoRoot, 'source/src/utils/agentSwarmsEnabled.ts'),
    'utf8',
  )
  const agentTool = readFileSync(
    join(repoRoot, 'source/src/tools/AgentTool/AgentTool.tsx'),
    'utf8',
  )
  const statusView = readFileSync(
    join(repoRoot, 'source/src/utils/status.tsx'),
    'utf8',
  )
  const authHandler = readFileSync(
    join(repoRoot, 'source/src/cli/handlers/auth.ts'),
    'utf8',
  )

  assert.match(
    providerRuntime,
    /supportsAgentTeams/,
    'provider runtime should expose agent-team capability explicitly',
  )
  assert.match(
    providerRuntime,
    /documentedOpenAiModelCapabilities/,
    'provider runtime should expose the documented OpenAI model capability surface separately from routed runtime support',
  )
  assert.match(
    providerRuntime,
    /routedOpenAiModelCapabilities/,
    'provider runtime should expose the routed OpenAI model capability surface separately from documented model support',
  )
  assert.match(
    providerRuntime,
    /supportsLocalToolSearch/,
    'provider runtime should expose local ToolSearch availability explicitly',
  )
  assert.match(
    providerRuntime,
    /supportsLocalSkills/,
    'provider runtime should expose local Skill tool availability explicitly',
  )
  assert.match(
    providerRuntime,
    /supportsLocalComputerUse/,
    'provider runtime should expose local computer-use availability explicitly',
  )
  assert.match(
    providerRuntime,
    /supportsLocalMcpTools/,
    'provider runtime should expose SeaTurtle local MCP tool support separately from OpenAI provider-hosted MCP',
  )
  assert.match(
    providerRuntime,
    /supportsComputerUse/,
    'provider runtime should expose OpenAI computer-use capability explicitly',
  )
  assert.match(
    providerRuntime,
    /supportsOpenAiBuiltInTools/,
    'provider runtime should expose OpenAI tool capability explicitly',
  )
  assert.match(
    providerRuntime,
    /supportsImageGeneration/,
    'provider runtime should expose OpenAI image-generation capability explicitly',
  )
  assert.match(
    providerRuntime,
    /supportsHostedShell/,
    'provider runtime should expose OpenAI hosted-shell capability explicitly',
  )
  assert.match(
    providerRuntime,
    /supportsWebSearch \|\|\s*supportsHostedFileSearch \|\|\s*supportsRemoteMcp \|\|\s*supportsComputerUse \|\|\s*supportsHostedShell \|\|\s*supportsImageGeneration/,
    'provider runtime should derive built-in tool capability from routed OpenAI tool support',
  )
  assert.match(
    swarmGate,
    /runtime\.family !== 'anthropic'/,
    'agent swarm gate should branch on provider-native runtimes instead of Anthropic-only assumptions',
  )
  assert.match(
    swarmGate,
    /runtime\.executionEnabled && runtime\.supportsAgentTeams/,
    'agent swarm gate should require ready provider auth before enabling teams',
  )
  assert.doesNotMatch(
    agentTool,
    /Agent Teams is not yet available on your plan\./,
    'AgentTool should not surface the legacy Anthropic plan entitlement error',
  )
  assert.doesNotMatch(
    agentTool,
    /z\.enum\(\['sonnet', 'opus', 'haiku'\]\)/,
    'AgentTool should not restrict model overrides to Anthropic-only aliases',
  )
  assert.match(
    statusView,
    /OpenAI\/Codex runtime/,
    'status view should surface the active OpenAI runtime capabilities',
  )
  assert.match(
    statusView,
    /OpenAI computer use/,
    'status view should surface a dedicated OpenAI computer-use availability row',
  )
  assert.match(
    authHandler,
    /localToolSearch/,
    'auth status JSON should expose local ToolSearch availability explicitly',
  )
  assert.match(
    authHandler,
    /localSkills/,
    'auth status JSON should expose local Skill tool availability explicitly',
  )
  assert.match(
    authHandler,
    /localComputerUse/,
    'auth status JSON should expose local computer-use availability explicitly',
  )
  assert.match(
    authHandler,
    /localMcpTools/,
    'auth status JSON should expose local MCP tool availability separately from provider-hosted remote MCP',
  )
  assert.match(
    authHandler,
    /computerUse/,
    'auth status JSON should expose OpenAI computer-use availability explicitly',
  )
  assert.match(
    authHandler,
    /hostedShell/,
    'auth status JSON should expose OpenAI hosted-shell availability explicitly',
  )
  assert.match(
    authHandler,
    /imageGeneration/,
    'auth status JSON should expose OpenAI image-generation availability explicitly',
  )
  assert.match(
    authHandler,
    /openAiCodexModelCapabilities/,
    'auth status JSON should expose documented OpenAI model capabilities',
  )
  assert.match(
    authHandler,
    /openAiCodexRoutedModelCapabilities/,
    'auth status JSON should expose routed OpenAI model capabilities separately from documented model support',
  )
  assert.match(
    authHandler,
    /openAiCodexCapabilities/,
    'auth status JSON should expose OpenAI capability flags',
  )
}

run()

console.log('openai agent capability self-test passed')
