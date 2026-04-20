import { readFileSync } from 'node:fs'

function assertMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

const fileSearchSource = readFileSync(
  'source/src/services/api/geminiFileSearch.ts',
  'utf8',
)
const configSource = readFileSync(
  'source/src/services/api/geminiFileSearchConfig.ts',
  'utf8',
)
const fileSearchToolSource = readFileSync(
  'source/src/tools/FileSearchTool/FileSearchTool.ts',
  'utf8',
)
const providerRuntimeSource = readFileSync(
  'source/src/services/api/providerRuntime.ts',
  'utf8',
)

assertMatch(
  fileSearchSource,
  /fileSearch:\s*\{\s*fileSearchStoreNames:/,
  'Gemini file search request should include configured file search store names',
)
assertMatch(
  fileSearchSource,
  /SEATURTLE_GEMINI_FILE_SEARCH_STORE_NAMES/,
  'Gemini file search should require explicit store configuration',
)
assertMatch(
  fileSearchSource,
  /retrievedContext|retrieved_context/,
  'Gemini file search should parse retrieved grounding context',
)
assertMatch(
  configSource,
  /SEATURTLE_GEMINI_FILE_SEARCH_DEFAULT_STORE/,
  'Gemini file search config should support a default store',
)
assertMatch(
  fileSearchToolSource,
  /runtime\.family === 'gemini'/,
  'FileSearchTool should route Gemini file search',
)
assertMatch(
  providerRuntimeSource,
  /hostedFileSearchConfigured = isGeminiHostedFileSearchConfigured\(\)/,
  'Gemini provider runtime should gate file search on configured stores',
)

console.log('gemini-file-search self-test passed')
