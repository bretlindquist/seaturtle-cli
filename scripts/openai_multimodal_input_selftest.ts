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
    /type OpenAiCodexContentPart =[\s\S]*OpenAiCodexImagePart[\s\S]*OpenAiCodexFilePart/,
    'OpenAI adapter should include image and file parts in the shared message-content union',
  )
  assert.match(
    openAiCodex,
    /if \(type === 'image'\) \{[\s\S]*type: 'input_image'[\s\S]*image_url: buildDataUrl\(mediaType, data\)/,
    'OpenAI adapter should map SeaTurtle image blocks to Responses input_image data URLs',
  )
  assert.match(
    openAiCodex,
    /if \(type === 'document'\) \{[\s\S]*type: 'input_file'[\s\S]*file_data: buildDataUrl\(mediaType, data\)/,
    'OpenAI adapter should map SeaTurtle document blocks to Responses input_file data URLs',
  )
  assert.match(
    openAiCodex,
    /if \(role === 'user'\) \{[\s\S]*convertUserMultimodalBlock/,
    'OpenAI adapter should preserve multimodal blocks specifically on user messages',
  )
  assert.match(
    openAiCodex,
    /mediaType === 'application\/pdf'[\s\S]*'attachment\.pdf'/,
    'OpenAI adapter should provide a stable PDF filename for base64 file inputs',
  )
}

run()

console.log('openai multimodal input self-test passed')
