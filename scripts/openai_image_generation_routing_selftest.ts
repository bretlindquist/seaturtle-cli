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
    /function buildOpenAiCodexImageGenerationToolConfig/,
    'OpenAI image-generation helper should build a dedicated tool config so size and action options stay explicit',
  )
  assert.match(
    openAiCodex,
    /tool_choice: \{ type: 'image_generation' \}/,
    'OpenAI image-generation helper should force the image_generation tool path',
  )
  assert.match(
    openAiCodex,
    /function validateOpenAiImageGenerationInput/,
    'OpenAI image-generation helper should validate provider-specific input limits instead of silently ignoring unsupported options',
  )
  assert.match(
    openAiCodex,
    /referenceImages\?: OpenAiCodexImageReferenceInput\[\]/,
    'OpenAI image-generation input should accept reference images for hosted edit flows',
  )
  assert.match(
    openAiCodex,
    /outputCount !== undefined && input\.outputCount !== 1/,
    'OpenAI image-generation helper should reject unsupported multi-image output counts explicitly',
  )
  assert.match(
    openAiCodex,
    /action === 'edit'/,
    'OpenAI image-generation helper should switch its instructions when the hosted tool is being used for editing',
  )
  assert.match(
    openAiCodex,
    /tools: \[imageTool\]/,
    'OpenAI image-generation helper should send the dedicated hosted image tool config in the request body',
  )
  assert.match(
    imageTool,
    /runtime\.routedOpenAiModelCapabilities\.includes\('image generation'\)/,
    'ImageGenerationTool should gate itself on the routed OpenAI image-generation capability',
  )
  assert.match(
    imageTool,
    /referenceImages:/,
    'ImageGenerationTool should forward reference images to the OpenAI image-generation helper',
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
