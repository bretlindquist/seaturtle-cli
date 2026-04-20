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

assertIncludes(
  providers,
  /shouldUseGeminiProvider/,
  'model provider selection should expose a Gemini provider gate',
)
assertIncludes(
  providerRuntime,
  /gemini-chat-completions/,
  'provider runtime should define a Gemini wire API',
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
  /tool_calls/,
  'Gemini runtime should translate tool calls',
)
assertIncludes(
  authHandler,
  /geminiRoutedModelCapabilities/,
  'auth status JSON should expose routed Gemini model capabilities',
)

console.log('gemini-runtime self-test passed')
