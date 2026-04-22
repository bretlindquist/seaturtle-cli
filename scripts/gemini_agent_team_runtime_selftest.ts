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

const spawnUtils = read('source/src/utils/swarm/spawnUtils.ts')
const teammateModel = read('source/src/utils/swarm/teammateModel.ts')
const exploreAgent = read('source/src/tools/AgentTool/built-in/exploreAgent.ts')

assertIncludes(
  spawnUtils,
  /'SEATURTLE_MAIN_PROVIDER'/,
  'teammate env forwarding should include SEATURTLE_MAIN_PROVIDER',
)
assertIncludes(
  spawnUtils,
  /'SEATURTLE_USE_GEMINI'/,
  'teammate env forwarding should include SEATURTLE_USE_GEMINI',
)
assertIncludes(
  spawnUtils,
  /'SEATURTLE_USE_OPENAI_CODEX'/,
  'teammate env forwarding should include SEATURTLE_USE_OPENAI_CODEX',
)
assertIncludes(
  spawnUtils,
  /'CLAUDE_CODE_MAIN_PROVIDER'/,
  'teammate env forwarding should include the legacy main-provider env',
)
assertIncludes(
  spawnUtils,
  /'CLAUDE_CODE_USE_GEMINI'/,
  'teammate env forwarding should include the legacy Gemini env',
)
assertIncludes(
  spawnUtils,
  /'CLAUDE_CODE_USE_OPENAI_CODEX'/,
  'teammate env forwarding should include the legacy OpenAI/Codex env',
)
assertIncludes(
  spawnUtils,
  /'GEMINI_API_KEY'/,
  'teammate env forwarding should include GEMINI_API_KEY',
)
assertIncludes(
  spawnUtils,
  /'GOOGLE_API_KEY'/,
  'teammate env forwarding should include GOOGLE_API_KEY',
)
assertIncludes(
  teammateModel,
  /getResolvedMainLoopModelForActiveProvider/,
  'teammate fallback should resolve through the active provider model helper',
)
assertIncludes(
  exploreAgent,
  /model:\s*'inherit'/,
  'Explore agent should inherit the parent model',
)
assert.doesNotMatch(
  exploreAgent,
  /model:\s*isAntRuntimeEnabled\(\)\s*\?\s*'inherit'\s*:\s*'haiku'/,
  'Explore agent should no longer pin external runtimes to haiku',
)

console.log('gemini agent team runtime self-test passed')
