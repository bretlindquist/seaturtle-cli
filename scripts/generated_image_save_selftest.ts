import { strict as assert } from 'assert'
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dir, '..')

const imageStoreSource = readFileSync(
  join(repoRoot, 'source/src/utils/imageStore.ts'),
  'utf8',
)
const imageToolSource = readFileSync(
  join(repoRoot, 'source/src/tools/ImageGenerationTool/ImageGenerationTool.ts'),
  'utf8',
)
const imageToolUiSource = readFileSync(
  join(repoRoot, 'source/src/tools/ImageGenerationTool/UI.tsx'),
  'utf8',
)

assert.match(
  imageStoreSource,
  /export function reserveImagePasteIds\(/,
  'imageStore should expose generated-image id reservation',
)
assert.match(
  imageStoreSource,
  /nextReservedImageId = 1/,
  'imageStore should maintain in-memory reservation state',
)
assert.match(
  imageStoreSource,
  /message\.attachment\?\.imagePasteIds/,
  'image id reservation should scan attachment image refs too',
)

assert.match(
  imageToolSource,
  /savedImageId: z\.number\(\)\.int\(\)\.positive\(\)\.nullable\(\)/,
  'image tool output schema should carry saved image ids',
)
assert.match(
  imageToolSource,
  /savedImagePath: z\.string\(\)\.nullable\(\)/,
  'image tool output schema should carry saved image paths',
)
assert.match(
  imageToolSource,
  /const \[savedImageId\] = reserveImagePasteIds\(context\.messages, 1\)/,
  'image tool should reserve an image id before saving',
)
assert.match(
  imageToolSource,
  /const savedImagePath = await storeImage\(storedImage\)/,
  'image tool should persist generated images through imageStore',
)
assert.match(
  imageToolSource,
  /Saved local copy as \[Image #\$\{content\.savedImageId\}\] at \$\{content\.savedImagePath\}/,
  'mapped tool result should tell the model where the saved image lives',
)

assert.match(
  imageToolUiSource,
  /Generated image in \{timeDisplay\}/,
  'tool result UI should still report generation timing',
)
assert.match(
  imageToolUiSource,
  /saved locally/,
  'tool result UI should report local persistence',
)
assert.match(
  imageToolUiSource,
  /<FilePathLink filePath=\{output\.savedImagePath\}>/,
  'tool result UI should render a real file link for the saved image',
)

console.log('generated_image_save_selftest: ok')
