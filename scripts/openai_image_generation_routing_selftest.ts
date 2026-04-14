import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const openAiCodex = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  const imageTool = readFileSync(
    join(repoRoot, 'source/src/tools/ImageGenerationTool/ImageGenerationTool.ts'),
    'utf8',
  )
  const tools = readFileSync(join(repoRoot, 'source/src/tools.ts'), 'utf8')

  assert.match(
    openAiCodex,
    /export async function runOpenAiCodexImageGeneration/,
    'OpenAI adapter should expose a hosted image-generation helper',
  )
  assert.match(
    openAiCodex,
    /tools: \[\{ type: 'image_generation' \}\]/,
    'OpenAI image-generation helper should call the hosted image_generation tool',
  )
  assert.match(
    openAiCodex,
    /tool_choice: \{ type: 'image_generation' \}/,
    'OpenAI image-generation helper should force the image_generation tool path',
  )
  assert.match(
    imageTool,
    /runtime\.routedOpenAiModelCapabilities\.includes\('image generation'\)/,
    'ImageGenerationTool should gate itself on the routed OpenAI image-generation capability',
  )
  assert.match(
    imageTool,
    /type: 'image'/,
    'ImageGenerationTool should return an image tool_result block',
  )
  assert.match(
    tools,
    /ImageGenerationTool/,
    'ImageGenerationTool should be registered in the global tool list',
  )
}

run()

console.log('openai image generation routing self-test passed')
