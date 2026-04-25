#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dirname, '..')
const geminiImageGeneration = readFileSync(
  join(repoRoot, 'source/src/services/api/geminiImageGeneration.ts'),
  'utf8',
)
const imageTool = readFileSync(
  join(repoRoot, 'source/src/tools/ImageGenerationTool/ImageGenerationTool.ts'),
  'utf8',
)
const providerRuntime = readFileSync(
  join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
  'utf8',
)

assert.match(geminiImageGeneration, /responseModalities: \['TEXT', 'IMAGE'\]/)
assert.match(geminiImageGeneration, /imageConfig/)
assert.match(geminiImageGeneration, /aspectRatio/)
assert.match(geminiImageGeneration, /imageSize/)
assert.match(geminiImageGeneration, /'1:4'/)
assert.match(geminiImageGeneration, /'1:8'/)
assert.match(geminiImageGeneration, /'4:1'/)
assert.match(geminiImageGeneration, /'4:5'/)
assert.match(geminiImageGeneration, /'5:4'/)
assert.match(geminiImageGeneration, /'8:1'/)
assert.match(geminiImageGeneration, /SUPPORTED_GEMINI_31_FLASH_IMAGE_SIZES/)
assert.match(geminiImageGeneration, /'512'/)
assert.match(geminiImageGeneration, /model === 'gemini-3.1-flash-image-preview'/)
assert.match(geminiImageGeneration, /inlineData/)
assert.match(geminiImageGeneration, /parseGeminiImageGenerationResponse/)
assert.match(geminiImageGeneration, /Gemini image generation returned no image output/)
assert.match(geminiImageGeneration, /MAX_REFERENCE_IMAGES/)
assert.match(geminiImageGeneration, /SEATURTLE_GEMINI_IMAGE_MODEL/)

assert.match(imageTool, /runtime\.family === 'gemini'/)
assert.match(imageTool, /runGeminiImageGeneration/)
assert.match(imageTool, /referenceImages/)
assert.match(imageTool, /aspectRatio/)
assert.match(imageTool, /imageSize/)
assert.match(
  providerRuntime,
  /const supportsImageGeneration =\s*\n\s*!!auth && routedModelCapabilities\.supportsImageGeneration/,
)

console.log('gemini-image-generation self-test passed')
