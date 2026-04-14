import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const toolSource = readFileSync(
    join(repoRoot, 'source/src/tools/FileSearchTool/FileSearchTool.ts'),
    'utf8',
  )
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const providerRuntime = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )

  assert.match(
    toolSource,
    /runOpenAiCodexFileSearch/,
    'FileSearchTool should route to the OpenAI file-search helper',
  )
  assert.match(
    openAiCodex,
    /export async function runOpenAiCodexFileSearch/,
    'OpenAI runtime should expose a dedicated file-search helper',
  )
  assert.match(
    openAiCodex,
    /type: 'file_search'/,
    'OpenAI file-search helper should use the Responses file_search built-in tool',
  )
  assert.match(
    openAiCodex,
    /vector_store_ids: vectorStoreIds/,
    'OpenAI file-search helper should pass configured vector store IDs',
  )
  assert.match(
    openAiCodex,
    /include: \['file_search_call\.results'\]/,
    'OpenAI file-search helper should request structured file-search results',
  )
  assert.match(
    providerRuntime,
    /routedModelCapabilities\.supportsFileSearch/,
    'provider runtime should gate hosted file search on the routed OpenAI model capabilities',
  )
}

run()

console.log('openai file search routing self-test passed')
