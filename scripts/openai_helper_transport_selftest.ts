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
  const codeInterpreterHelper = extractFunctionBody(
    openAiCodex,
    'export async function runOpenAiCodexCodeInterpreter',
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
    /stream: true/,
    'OpenAI image generation helper should use the streaming transport required by the current backend path',
  )
  assert.match(
    imageGenerationHelper,
    /await response\.text\(\)/,
    'OpenAI image generation helper should parse the streaming body text instead of assuming a non-streaming JSON payload',
  )
  assert.match(
    imageGenerationHelper,
    /nextSseFrame\(/,
    'OpenAI image generation helper should parse SSE frames when using the streaming transport',
  )

  assert.match(
    codeInterpreterHelper,
    /await response\.json\(\)/,
    'OpenAI code interpreter helper should continue using the standard non-streaming Responses body',
  )
  assert.doesNotMatch(
    codeInterpreterHelper,
    /stream: true/,
    'OpenAI code interpreter helper should not silently drift to streaming without a matching event parser',
  )

  assert.match(
    hostedShellHelper,
    /stream: true/,
    'OpenAI hosted shell helper should use the streaming transport required by the current backend path',
  )
  assert.match(
    hostedShellHelper,
    /await response\.text\(\)/,
    'OpenAI hosted shell helper should parse the streaming body text instead of assuming a non-streaming JSON payload',
  )
  assert.match(
    hostedShellHelper,
    /nextSseFrame\(/,
    'OpenAI hosted shell helper should parse SSE frames when using the streaming transport',
  )
}

run()

console.log('openai helper transport self-test passed')
