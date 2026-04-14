import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const webSearchTool = readFileSync(
    join(repoRoot, 'source/src/tools/WebSearchTool/WebSearchTool.ts'),
    'utf8',
  )
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const webSearchHelperStart = openAiCodex.indexOf(
    'export async function runOpenAiCodexWebSearch',
  )
  const webSearchHelperEnd = openAiCodex.indexOf(
    'export async function runOpenAiCodexFileSearch',
  )
  assert.notEqual(
    webSearchHelperStart,
    -1,
    'OpenAI runtime should define runOpenAiCodexWebSearch',
  )
  assert.notEqual(
    webSearchHelperEnd,
    -1,
    'OpenAI runtime should define runOpenAiCodexFileSearch after the web-search helper',
  )
  const webSearchHelper = openAiCodex.slice(webSearchHelperStart, webSearchHelperEnd)

  assert.match(
    webSearchTool,
    /return runtime\.supportsWebSearch/,
    'WebSearchTool should enable itself from the OpenAI runtime capability flag',
  )
  assert.match(
    webSearchTool,
    /runtime\.family === 'openai' && blocked_domains\?\.length/,
    'WebSearchTool should explicitly gate unsupported blocked_domains on OpenAI',
  )
  assert.match(
    webSearchTool,
    /runOpenAiCodexWebSearch/,
    'WebSearchTool should route OpenAI web searches through the OpenAI runtime helper',
  )
  assert.match(
    openAiCodex,
    /export async function runOpenAiCodexWebSearch/,
    'OpenAI runtime should expose a dedicated web-search helper',
  )
  assert.match(
    openAiCodex,
    /function buildSingleTurnOpenAiCodexInput/,
    'OpenAI runtime should centralize standalone built-in tool input shaping',
  )
  assert.match(
    openAiCodex,
    /include: \['web_search_call\.action\.sources'\]/,
    'OpenAI web search helper should request full consulted-source capture',
  )
  assert.match(
    openAiCodex,
    /type: 'web_search'/,
    'OpenAI web search helper should use the Responses web_search built-in tool',
  )
  assert.match(
    webSearchHelper,
    /stream: true/,
    'OpenAI web search helper should request a streaming Responses payload when the backend requires stream mode',
  )
  assert.doesNotMatch(
    webSearchHelper,
    /input: params\.query/,
    'OpenAI web search helper should not send raw string input directly to the Responses backend',
  )
  assert.doesNotMatch(
    webSearchHelper,
    /await response\.json\(\)/,
    'OpenAI web search helper should not assume a non-streaming JSON body',
  )
}

run()

console.log('openai web search routing self-test passed')
