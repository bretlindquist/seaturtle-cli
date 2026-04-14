import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function extractFunctionBody(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  assert.notEqual(start, -1, `missing function start marker: ${startMarker}`)
  assert.notEqual(end, -1, `missing function end marker: ${endMarker}`)
  return source.slice(start, end)
}

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )

  const webSearchHelper = extractFunctionBody(
    openAiCodex,
    'export async function runOpenAiCodexWebSearch',
    'export async function runOpenAiCodexFileSearch',
  )
  const fileSearchHelper = extractFunctionBody(
    openAiCodex,
    'export async function runOpenAiCodexFileSearch',
    'export async function runOpenAiCodexImageGeneration',
  )
  const imageGenerationHelper = extractFunctionBody(
    openAiCodex,
    'export async function runOpenAiCodexImageGeneration',
    'export async function runOpenAiCodexHostedShell',
  )
  const hostedShellHelper = extractFunctionBody(
    openAiCodex,
    'export async function runOpenAiCodexHostedShell',
    'export async function runOpenAiCodexComputerUse',
  )

  assert.match(
    webSearchHelper,
    /stream: true/,
    'OpenAI web search helper should use the streaming transport required by the current backend path',
  )
  assert.doesNotMatch(
    webSearchHelper,
    /await response\.json\(\)/,
    'OpenAI web search helper should not parse the response as a non-streaming JSON body',
  )

  assert.match(
    fileSearchHelper,
    /await response\.json\(\)/,
    'OpenAI file search helper should continue using the standard non-streaming Responses body',
  )
  assert.doesNotMatch(
    fileSearchHelper,
    /stream: true/,
    'OpenAI file search helper should not silently drift to streaming without a matching parser change',
  )

  assert.match(
    imageGenerationHelper,
    /await response\.json\(\)/,
    'OpenAI image generation helper should keep using the standard non-streaming Responses body for final-image output',
  )
  assert.doesNotMatch(
    imageGenerationHelper,
    /stream: true/,
    'OpenAI image generation helper should not silently drift to streaming without partial-image handling',
  )

  assert.match(
    hostedShellHelper,
    /await response\.json\(\)/,
    'OpenAI hosted shell helper should continue using the standard non-streaming Responses body',
  )
  assert.doesNotMatch(
    hostedShellHelper,
    /stream: true/,
    'OpenAI hosted shell helper should not silently drift to streaming without a matching shell event parser',
  )
}

run()

console.log('openai helper transport self-test passed')
