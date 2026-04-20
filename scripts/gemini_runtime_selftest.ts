import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dirname, '..')

function assertIncludes(haystack: string, needle: RegExp, message: string) {
  if (!needle.test(haystack)) {
    throw new Error(message)
  }
}

const providerRuntime = readFileSync(
  join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
  'utf8',
)
const gemini = readFileSync(
  join(repoRoot, 'source/src/services/api/gemini.ts'),
  'utf8',
)
const providers = readFileSync(
  join(repoRoot, 'source/src/utils/model/providers.ts'),
  'utf8',
)
const authHandler = readFileSync(
  join(repoRoot, 'source/src/cli/handlers/auth.ts'),
  'utf8',
)
const managedEnvConstants = readFileSync(
  join(repoRoot, 'source/src/utils/managedEnvConstants.ts'),
  'utf8',
)

assertIncludes(
  providers,
  /shouldUseGeminiProvider/,
  'model provider selection should expose a Gemini provider gate',
)
assertIncludes(
  providers,
  /process\.env\.SEATURTLE_MAIN_PROVIDER/,
  'model provider selection should prefer the SeaTurtle main-provider env var',
)
assertIncludes(
  providers,
  /process\.env\.SEATURTLE_USE_GEMINI/,
  'model provider selection should expose a SeaTurtle Gemini boolean gate',
)
assertIncludes(
  providers,
  /process\.env\.SEATURTLE_USE_OPENAI_CODEX/,
  'model provider selection should expose a SeaTurtle OpenAI/Codex boolean gate',
)
assertIncludes(
  providers,
  /getSeaTurtleMainProviderEnv\(\) \?\?\s*getConfiguredMainProvider\(\) \?\?\s*getLegacyMainProviderEnv\(\)/,
  'main-provider precedence should be SeaTurtle env, then persisted config, then legacy Claude env',
)
assertIncludes(
  managedEnvConstants,
  /SEATURTLE_MAIN_PROVIDER/,
  'managed provider env filtering should include the SeaTurtle main-provider env var',
)
assertIncludes(
  providerRuntime,
  /gemini-chat-completions/,
  'provider runtime should define a Gemini wire API',
)
assertIncludes(
  providerRuntime,
  /const execution = preferred/,
  'provider runtime should not silently fall back to Anthropic when a preferred provider is not auth-ready',
)
assertIncludes(
  providerRuntime,
  /return buildGeminiMainLoopRuntime\(\)/,
  'getMainLoopProviderRuntime should return the preferred Gemini runtime even when auth setup is incomplete',
)
assertIncludes(
  providerRuntime,
  /return openAiCodex/,
  'getMainLoopProviderRuntime should return the preferred OpenAI runtime even when auth setup is incomplete',
)
assertIncludes(
  providerRuntime,
  /queryGeminiWithStreaming/,
  'provider runtime should route streaming calls to Gemini',
)
assertIncludes(
  providerRuntime,
  /queryGeminiWithoutStreaming/,
  'provider runtime should route non-streaming calls to Gemini',
)
assertIncludes(
  gemini,
  /GEMINI_API_KEY/,
  'Gemini runtime should support explicit API-key auth',
)
assertIncludes(
  gemini,
  /SEATURTLE_MAIN_PROVIDER=gemini/,
  'Gemini auth setup guidance should use the SeaTurtle provider env var',
)
assertIncludes(
  gemini,
  /tool_calls/,
  'Gemini runtime should translate tool calls',
)
assertIncludes(
  authHandler,
  /geminiRoutedModelCapabilities/,
  'auth status JSON should expose routed Gemini model capabilities',
)

console.log('gemini-runtime self-test passed')
