import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dirname, '..')

function assertIncludes(haystack: string, needle: RegExp, message: string) {
  if (!needle.test(haystack)) {
    throw new Error(message)
  }
}

function assertNotIncludes(haystack: string, needle: RegExp, message: string) {
  if (needle.test(haystack)) {
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
const geminiContent = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiContent.ts'),
  'utf8',
)
const geminiThoughtSignatures = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiThoughtSignatures.ts'),
  'utf8',
)
const geminiToolSchema = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiToolSchema.ts'),
  'utf8',
)
const geminiThinkingConfig = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiThinkingConfig.ts'),
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
  /getSeaTurtleMainProviderEnv\(\)\s*\?\?\s*getSeaTurtleBooleanProviderEnv\(\)\s*\?\?\s*getConfiguredMainProvider\(\)\s*\?\?\s*getLegacyMainProviderEnv\(\)\s*\?\?\s*getLegacyBooleanProviderEnv\(\)/,
  'main-provider precedence should be SeaTurtle main env, SeaTurtle boolean env, persisted config, legacy main env, then legacy boolean env',
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
  geminiContent,
  /functionCall/,
  'Gemini runtime should translate native Gemini function calls',
)
assertIncludes(
  gemini,
  /parseGeminiAssistantContent/,
  'Gemini runtime should parse native Gemini responses through the content mapper',
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
  geminiContent,
  /inlineData/,
  'Gemini runtime should send image input through native Gemini inlineData parts',
)
assertIncludes(
  geminiContent,
  /functionResponse/,
  'Gemini content mapper should convert tool results to native functionResponse parts',
)
assertIncludes(
  geminiContent,
  /buildGeminiFunctionDeclaration/,
  'Gemini content mapper should use the Gemini-specific tool declaration builder',
)
assertNotIncludes(
  geminiContent,
  /normalizeOpenAiToolParameterSchema/,
  'Gemini content mapper must not reuse the OpenAI tool schema normalizer',
)
assertIncludes(
  geminiToolSchema,
  /normalizeGeminiToolParameterSchema/,
  'Gemini tool schema normalizer should be provider-specific',
)
assertIncludes(
  geminiToolSchema,
  /UNSUPPORTED_GEMINI_SCHEMA_KEYS/,
  'Gemini tool schema normalizer should strip unsupported schema keys',
)
assertIncludes(
  geminiContent,
  /thoughtSignature/,
  'Gemini content mapper should preserve thought signatures on native parts',
)
assertIncludes(
  geminiThoughtSignatures,
  /providerMetadata/,
  'Gemini thought signatures should be stored in hidden provider metadata',
)
assertIncludes(
  geminiThoughtSignatures,
  /requiresThoughtSignature/,
  'Gemini thought-signature metadata should mark required replay signatures',
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
  geminiClient,
  /alt=sse/,
  'Gemini streaming endpoint should request SSE responses',
)
assertIncludes(
  geminiClient,
  /runGeminiStreamGenerateContent/,
  'Gemini native client should expose a real streaming request path',
)
assertIncludes(
  gemini,
  /runGeminiStreamGenerateContent/,
  'Gemini runtime should call the native streaming client',
)
assertIncludes(
  gemini,
  /text_delta/,
  'Gemini streaming should emit text deltas',
)
assertIncludes(
  gemini,
  /input_json_delta/,
  'Gemini streaming should emit tool input JSON deltas',
)
assertIncludes(
  gemini,
  /message_stop/,
  'Gemini streaming should emit message_stop events',
)
assertNotIncludes(
  gemini,
  /yield await queryGeminiWithoutStreaming\(params\)/,
  'Gemini streaming must not fake streaming by yielding the non-streaming result',
)
assertIncludes(
  gemini,
  /buildGeminiThinkingConfig/,
  'Gemini runtime should map effort through Gemini-native thinking config',
)
assertIncludes(
  geminiThinkingConfig,
  /thinkingLevel/,
  'Gemini 3 thinking should use thinkingLevel',
)
assertIncludes(
  geminiThinkingConfig,
  /thinkingBudget/,
  'Gemini 2.5 thinking should use thinkingBudget',
)
assertNotIncludes(
  gemini,
  /reasoning_effort/,
  'Gemini native requests must not send OpenAI-style reasoning_effort',
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
