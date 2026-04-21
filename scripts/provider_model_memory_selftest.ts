import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const config = readFileSync(join(repoRoot, 'source/src/utils/config.ts'), 'utf8')
const model = readFileSync(
  join(repoRoot, 'source/src/utils/model/model.ts'),
  'utf8',
)
const appStateChange = readFileSync(
  join(repoRoot, 'source/src/state/onChangeAppState.ts'),
  'utf8',
)
const startupAuthFlow = readFileSync(
  join(repoRoot, 'source/src/components/StartupAuthFlow.tsx'),
  'utf8',
)
const mainLoopHook = readFileSync(
  join(repoRoot, 'source/src/hooks/useMainLoopModel.ts'),
  'utf8',
)

assert.match(
  config,
  /rememberedAnthropicMainModel\?: string/,
  'GlobalConfig should persist a remembered Anthropic main model',
)
assert.match(
  config,
  /rememberedOpenAiCodexMainModel\?: string/,
  'GlobalConfig should persist a remembered OpenAI\/Codex main model',
)
assert.match(
  config,
  /rememberedGeminiMainModel\?: string/,
  'GlobalConfig should persist a remembered Gemini main model',
)
assert.match(
  model,
  /getRememberedMainLoopModelSettingForActiveProvider/,
  'model resolution should expose an active-provider remembered-model helper',
)
assert.match(
  model,
  /getResolvedMainLoopModelForProvider/,
  'model resolution should support explicit provider-scoped model resolution',
)
assert.match(
  model,
  /getResolvedMainLoopModelForActiveProvider\(getUserSpecifiedModelSetting\(\)\)/,
  'getMainLoopModel should fall back through the active-provider remembered-model path',
)
assert.match(
  appStateChange,
  /rememberedAnthropicMainModel|rememberedOpenAiCodexMainModel|rememberedGeminiMainModel/,
  'app-state changes should persist remembered models by provider',
)
assert.match(
  appStateChange,
  /getPreferredMainRuntimeProvider/,
  'remembered-model persistence should follow the preferred main runtime provider',
)
assert.match(
  startupAuthFlow,
  /getResolvedMainLoopModelForProvider/,
  'startup auth flow should seed provider model selection from provider-scoped resolution',
)
assert.match(
  mainLoopHook,
  /getResolvedMainLoopModelForActiveProvider/,
  'useMainLoopModel should use active-provider remembered-model resolution',
)

console.log('provider model memory self-test passed')
