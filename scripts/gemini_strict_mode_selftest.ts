import { readFileSync } from 'fs'
import { join } from 'path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const repoRoot = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const behaviorModeSource = read('source/src/utils/geminiBehaviorMode.ts')
assert(
  behaviorModeSource.includes("['off', 'strict']"),
  'expected Gemini behavior mode options to include off and strict',
)
assert(
  behaviorModeSource.includes("return value === 'strict' ? 'strict' : DEFAULT_GEMINI_BEHAVIOR_MODE"),
  'expected Gemini behavior mode normalization to fail closed to off',
)

const strictModeSource = read('source/src/services/api/geminiStrictMode.ts')
assert(
  strictModeSource.includes('GEMINI_STRICT_SYSTEM_PROMPT'),
  'expected Gemini strict prompt copy to exist',
)
assert(
  strictModeSource.includes("return provider === 'gemini' && mode === 'strict'"),
  'expected strict mode activation to stay Gemini-only',
)
assert(
  strictModeSource.includes('appendSystemPrompt?.includes(GEMINI_STRICT_SYSTEM_PROMPT)'),
  'expected strict prompt helper to avoid duplicate prompt injection',
)

const queryEngineSource = read('source/src/QueryEngine.ts')
assert(
  queryEngineSource.includes('buildGeminiStrictAppendSystemPrompt'),
  'expected QueryEngine to apply the Gemini strict prompt helper',
)
assert(
  queryEngineSource.includes('effectiveAppendSystemPrompt'),
  'expected QueryEngine to reuse the effective Gemini strict prompt',
)

const queryContextSource = read('source/src/utils/queryContext.ts')
assert(
  queryContextSource.includes('buildGeminiStrictAppendSystemPrompt'),
  'expected side-question fallback context to apply the Gemini strict prompt helper',
)

const configSource = read('source/src/utils/config.ts')
assert(
  configSource.includes('geminiBehaviorMode?: GeminiBehaviorMode'),
  'expected global config to persist the Gemini behavior mode',
)
assert(
  configSource.includes("geminiBehaviorMode: 'off'"),
  'expected Gemini behavior mode to default to off',
)

const settingsSource = read('source/src/components/Settings/Config.tsx')
assert(
  settingsSource.includes("id: 'geminiBehaviorMode'"),
  'expected /config to expose the Gemini behavior mode setting',
)

const supportedSettingsSource = read(
  'source/src/tools/ConfigTool/supportedSettings.ts',
)
assert(
  supportedSettingsSource.includes('geminiBehaviorMode'),
  'expected ConfigTool to support the Gemini behavior mode setting',
)

const commandsSource = read('source/src/commands.ts')
assert(
  commandsSource.includes("import gemini from './commands/gemini/index.js'"),
  'expected /gemini to be registered in the command surface',
)

const geminiCommandSource = read('source/src/commands/gemini/gemini.tsx')
assert(
  geminiCommandSource.includes('/gemini strict'),
  'expected the /gemini command to advertise strict mode usage',
)

const docsSource = read('docs/GEMINI.md')
assert(
  docsSource.includes('/gemini strict'),
  'expected Gemini docs to mention the strict mode command surface',
)

console.log('gemini strict mode self-test passed')
