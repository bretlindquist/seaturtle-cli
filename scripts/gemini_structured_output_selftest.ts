import { readFileSync } from 'node:fs'

function assertMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

const geminiSource = readFileSync(
  'source/src/services/api/gemini.ts',
  'utf8',
)
const providerHelpersSource = readFileSync(
  'source/src/services/api/providerHelpers.ts',
  'utf8',
)

assertMatch(
  geminiSource,
  /responseMimeType:\s*'application\/json'/,
  'Gemini structured output should request application/json responses.',
)
assertMatch(
  geminiSource,
  /responseJsonSchema:\s*structuredOutput\.responseJsonSchema/,
  'Gemini structured output should forward the JSON schema natively.',
)
assertMatch(
  providerHelpersSource,
  /outputFormat/,
  'Provider helpers should continue exposing outputFormat to provider runtimes.',
)

console.log('gemini-structured-output self-test passed')
