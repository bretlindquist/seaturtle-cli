import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const webFetchUtils = readFileSync(
    join(repoRoot, 'source/src/tools/WebFetchTool/utils.ts'),
    'utf8',
  )

  assert.match(
    openAiCodex,
    /runOpenAiCodexWebSearch[\s\S]*instructions:/,
    'OpenAI web search helper should send explicit instructions in the Responses payload',
  )
  assert.match(
    webFetchUtils,
    /class SiteForbiddenError extends Error/,
    'WebFetch should classify plain target-site 403 responses explicitly',
  )
  assert.match(
    webFetchUtils,
    /returned 403 Forbidden/,
    'WebFetch should explain target-site 403 failures clearly',
  )
}

run()

console.log('openai web/fetch error self-test passed')
