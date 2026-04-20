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
const geminiCapabilityConfig = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiCapabilityConfig.ts'),
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
const geminiClient = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiClient.ts'),
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
  /gemini-generate-content/,
  'provider runtime should define a native Gemini generateContent wire API',
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
  /functionCall/,
  'Gemini runtime should translate native Gemini function calls',
)
assertIncludes(
  gemini,
  /runGeminiGenerateContent/,
  'Gemini runtime should use the native generateContent client',
)
assertIncludes(
  gemini,
  /systemInstruction/,
  'Gemini runtime should send native Gemini systemInstruction fields',
)
assertIncludes(
  gemini,
  /inlineData/,
  'Gemini runtime should send image input through native Gemini inlineData parts',
)
assertIncludes(
  geminiClient,
  /x-goog-api-key/,
  'Gemini native client should use x-goog-api-key auth',
)
assertIncludes(
  geminiClient,
  /:generateContent/,
  'Gemini native client should call the generateContent endpoint',
)
assertIncludes(
  geminiClient,
  /:streamGenerateContent/,
  'Gemini native client should define the streamGenerateContent endpoint for Wave 5',
)
assertIncludes(
  geminiCapabilityConfig,
  /documented capabilities/i,
  'Gemini capability config should explicitly track documented capability truth',
)
assertIncludes(
  geminiCapabilityConfig,
  /ROUTED_GEMINI_MODEL_CAPABILITIES/,
  'Gemini capability config should separately track routed capability truth',
)
assertIncludes(
  geminiCapabilityConfig,
  /gemini-3\.1-pro-preview/,
  'Gemini capability config should include current Gemini 3.1 Pro Preview',
)
assertIncludes(
  geminiCapabilityConfig,
  /gemini-3\.1-flash-image-preview/,
  'Gemini capability config should include Gemini image generation models',
)
assertIncludes(
  geminiCapabilityConfig,
  /gemini-2\.5-computer-use-preview-10-2025/,
  'Gemini capability config should include the current Gemini computer-use model',
)
assertIncludes(
  geminiCapabilityConfig,
  /gemini-embedding-001/,
  'Gemini capability config should include the file-search embedding model reference',
)
assertIncludes(
  authHandler,
  /geminiRoutedModelCapabilities/,
  'auth status JSON should expose routed Gemini model capabilities',
)

console.log('gemini-runtime self-test passed')
