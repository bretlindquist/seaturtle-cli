#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dirname, '..')

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

function assertIncludes(
  haystack: string,
  needle: RegExp,
  message: string,
): void {
  assert.match(haystack, needle, message)
}

const providerRuntime = read('source/src/services/api/providerRuntime.ts')
const swarmGate = read('source/src/utils/agentSwarmsEnabled.ts')
const spawnUtils = read('source/src/utils/swarm/spawnUtils.ts')
const teammateModel = read('source/src/utils/swarm/teammateModel.ts')
const agentTool = read('source/src/tools/AgentTool/AgentTool.tsx')

for (const envName of [
  'SEATURTLE_MAIN_PROVIDER',
  'SEATURTLE_USE_GEMINI',
  'SEATURTLE_USE_OPENAI_CODEX',
  'CLAUDE_CODE_MAIN_PROVIDER',
  'CLAUDE_CODE_USE_GEMINI',
  'CLAUDE_CODE_USE_OPENAI_CODEX',
  'CLAUDE_CONFIG_DIR',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  assertIncludes(
    spawnUtils,
    new RegExp(`'${envName}'`),
    `teammate env forwarding should include ${envName}`,
  )
}

assertIncludes(
  providerRuntime,
  /supportsAgentTeams:\s*true/,
  'Anthropic runtime should keep its native team path enabled',
)
assertIncludes(
  providerRuntime,
  /supportsAgentTeams:\s*readiness\.ready/,
  'OpenAI runtime should gate teams on ready OpenAI auth',
)
assertIncludes(
  providerRuntime,
  /supportsAgentTeams:\s*readiness\.ready\s*\|\|\s*!!process\.env\.GEMINI_API_KEY\?\.trim\(\)/,
  'Gemini runtime should gate teams on ready Gemini auth or explicit GEMINI_API_KEY',
)
assertIncludes(
  swarmGate,
  /runtime\.family !== 'anthropic'/,
  'team gate should branch on provider-native runtimes instead of Anthropic-only assumptions',
)
assertIncludes(
  swarmGate,
  /runtime\.executionEnabled && runtime\.supportsAgentTeams/,
  'team gate should require ready provider execution before enabling non-Anthropic teams',
)
assertIncludes(
  teammateModel,
  /getResolvedMainLoopModelForActiveProvider/,
  'teammate fallback model should resolve through the active provider',
)
assert.doesNotMatch(
  agentTool,
  /Agent Teams is not yet available on your plan\./,
  'AgentTool should not expose the legacy Anthropic-only entitlement error',
)

console.log('provider agent team runtime self-test passed')
