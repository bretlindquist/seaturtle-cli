import { readFileSync } from 'node:fs'

function assertMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

const geminiClientSource = readFileSync(
  'source/src/services/api/geminiClient.ts',
  'utf8',
)
const contextSource = readFileSync(
  'source/src/utils/context.ts',
  'utf8',
)
const capabilitySource = readFileSync(
  'source/src/services/api/geminiCapabilityConfig.ts',
  'utf8',
)

assertMatch(
  geminiClientSource,
  /:countTokens/,
  'Gemini client should expose the native countTokens endpoint.',
)
assertMatch(
  geminiClientSource,
  /runGeminiCountTokens/,
  'Gemini client should provide a countTokens runner.',
)
assertMatch(
  capabilitySource,
  /contextWindowTokens:\s*1_048_576/,
  'Gemini capability config should carry model context windows.',
)
assertMatch(
  capabilitySource,
  /outputTokenLimit:\s*65_536/,
  'Gemini capability config should carry model output token limits.',
)
assertMatch(
  contextSource,
  /getGeminiModelDefinition/,
  'Context utilities should consult Gemini model definitions for routed model limits.',
)

console.log('gemini-token-count self-test passed')
