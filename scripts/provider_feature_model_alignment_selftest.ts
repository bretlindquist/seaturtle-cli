import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const imageTool = readFileSync(
  join(repoRoot, 'source/src/tools/ImageGenerationTool/ImageGenerationTool.ts'),
  'utf8',
)
const computerUseTool = readFileSync(
  join(repoRoot, 'source/src/tools/ComputerUseTool/ComputerUseTool.ts'),
  'utf8',
)
const teamCreateTool = readFileSync(
  join(repoRoot, 'source/src/tools/TeamCreateTool/TeamCreateTool.ts'),
  'utf8',
)
const providerRuntime = readFileSync(
  join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
  'utf8',
)

assert.match(
  imageTool,
  /runtime\.family === 'gemini'/,
  'image generation should dispatch by active provider family',
)
assert.match(
  imageTool,
  /provider-hosted and uses the[\s\S]*dedicated image-model routing/,
  'image generation should document that provider-hosted image models are separate from the main-loop model',
)
assert.match(
  computerUseTool,
  /runtime\.family === 'gemini'/,
  'computer use should dispatch by active provider family',
)
assert.match(
  computerUseTool,
  /dedicated[\s\S]*computer-use model loop/,
  'computer use should document that provider-hosted computer-use models are separate from the main-loop model',
)
assert.match(
  teamCreateTool,
  /mainLoopModelForSession \?\?\s*appState\.mainLoopModel \?\?\s*getDefaultMainLoopModel\(\)/,
  'team creation should inherit the active session or base main-loop model for the current provider',
)
assert.match(
  providerRuntime,
  /const computerUseModel = getDefaultGeminiComputerUseModel\(\)/,
  'provider runtime should keep Gemini computer-use model routing explicit',
)
assert.match(
  providerRuntime,
  /const geminiImageGenerationModelReady =\s*\n?\s*validateGeminiImageGenerationModel\(\) === null/,
  'provider runtime should validate the dedicated Gemini image model separately from the main-loop model',
)
assert.match(
  providerRuntime,
  /const supportsImageGeneration =\s*\n?\s*!!auth && geminiImageGenerationModelReady/,
  'provider runtime should gate Gemini image generation through auth plus dedicated image-model routing truth',
)

console.log('provider feature model alignment self-test passed')
