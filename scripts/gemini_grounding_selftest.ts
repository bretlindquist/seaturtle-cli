import { readFileSync } from 'node:fs'

function assertMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

const webSearchSource = readFileSync(
  'source/src/services/api/geminiWebSearch.ts',
  'utf8',
)
const urlContextSource = readFileSync(
  'source/src/services/api/geminiUrlContext.ts',
  'utf8',
)
const groundingSource = readFileSync(
  'source/src/services/api/geminiGrounding.ts',
  'utf8',
)
const webSearchToolSource = readFileSync(
  'source/src/tools/WebSearchTool/WebSearchTool.ts',
  'utf8',
)
const webFetchToolSource = readFileSync(
  'source/src/tools/WebFetchTool/WebFetchTool.ts',
  'utf8',
)
const capabilitySource = readFileSync(
  'source/src/services/api/geminiCapabilityConfig.ts',
  'utf8',
)
const providerRuntimeSource = readFileSync(
  'source/src/services/api/providerRuntime.ts',
  'utf8',
)

assertMatch(
  webSearchSource,
  /tools:\s*\[\{\s*googleSearch:\s*\{\s*\}\s*\}\]/,
  'Gemini web search request should route googleSearch tool',
)
assertMatch(
  webSearchSource,
  /collectGeminiGroundingSources/,
  'Gemini web search should parse grounding sources',
)
assertMatch(
  urlContextSource,
  /tools:\s*\[\{\s*urlContext:\s*\{\s*\}\s*\}\]/,
  'Gemini URL context request should route urlContext tool',
)
assertMatch(
  groundingSource,
  /supports at most 20 URLs per request/,
  'Gemini URL context validator should enforce the 20 URL limit',
)
assertMatch(
  groundingSource,
  /localhost|private-network|tunneling-service/,
  'Gemini URL context validator should reject unsupported URL classes',
)
assertMatch(
  webSearchToolSource,
  /runtime\.family === 'gemini'/,
  'WebSearchTool should route Gemini web search',
)
assertMatch(
  webFetchToolSource,
  /runtime\.family === 'gemini'/,
  'WebFetchTool should route Gemini URL context',
)
assertMatch(
  capabilitySource,
  /supportsWebSearch:\s*true/,
  'Gemini routed capabilities should include web search',
)
assertMatch(
  capabilitySource,
  /supportsUrlContext:\s*true/,
  'Gemini routed capabilities should include URL context',
)
assertMatch(
  providerRuntimeSource,
  /const supportsWebSearch = !!auth && routedModelCapabilities\.supportsWebSearch/,
  'Gemini provider runtime should enable web search only when auth and routing are ready',
)

console.log('gemini-grounding self-test passed')
