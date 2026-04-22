import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )

  assert.match(
    openAiCodex,
    /function buildSingleTurnOpenAiCodexInput/,
    'standalone OpenAI built-in tools should use a shared single-turn input builder',
  )
  assert.match(
    openAiCodex,
    /function buildOpenAiCodexImageGenerationInput/,
    'OpenAI image generation should use a dedicated multimodal input builder so reference images route through structured Responses input',
  )

  for (const fnName of [
    'runOpenAiCodexWebSearch',
    'runOpenAiCodexFileSearch',
    'runOpenAiCodexCodeInterpreter',
    'runOpenAiCodexHostedShell',
    'runOpenAiCodexComputerUse',
  ]) {
    assert.match(
      openAiCodex,
      new RegExp(`${fnName}[\\s\\S]*buildSingleTurnOpenAiCodexInput\\(`),
      `${fnName} should build structured single-turn input through the shared helper`,
    )
  }
  assert.match(
    openAiCodex,
    /runOpenAiCodexImageGeneration[\s\S]*buildOpenAiCodexImageGenerationInput\(/,
    'image generation should build structured multimodal input through the dedicated image helper',
  )

  assert.doesNotMatch(
    openAiCodex,
    /runOpenAiCodexWebSearch[\s\S]*input: params\.query/,
    'web search should not send raw string input directly',
  )
  assert.doesNotMatch(
    openAiCodex,
    /runOpenAiCodexFileSearch[\s\S]*input: params\.query/,
    'file search should not send raw string input directly',
  )
  assert.doesNotMatch(
    openAiCodex,
    /runOpenAiCodexImageGeneration[\s\S]*input: params\.input\.prompt/,
    'image generation should not send raw string input directly',
  )
  assert.match(
    openAiCodex,
    /type: 'input_image'/,
    'image generation input conversion should be able to include reference images as input_image parts',
  )
  assert.doesNotMatch(
    openAiCodex,
    /runOpenAiCodexHostedShell[\s\S]*input: params\.task/,
    'hosted shell should not send raw string input directly',
  )
  assert.doesNotMatch(
    openAiCodex,
    /runOpenAiCodexCodeInterpreter[\s\S]*input: params\.task/,
    'code interpreter should not send raw string input directly',
  )
  assert.doesNotMatch(
    openAiCodex,
    /runOpenAiCodexComputerUse[\s\S]*input: params\.task/,
    'computer use should not send raw string input directly on the initial request',
  )
}

run()

console.log('openai built-in input shape self-test passed')
