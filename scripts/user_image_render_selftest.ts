import { strict as assert } from 'assert'
import { shouldRenderStandaloneUserImage } from '../source/src/components/messages/userImageRender.js'

function imageBlock() {
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/png' as const,
      data: 'abc',
    },
  }
}

assert.equal(
  shouldRenderStandaloneUserImage(
    [{ type: 'text', text: '[Image #1] , take a look' }, imageBlock()],
    1,
  ),
  false,
  'inline image reference should suppress the duplicate standalone image row',
)

assert.equal(
  shouldRenderStandaloneUserImage(
    [{ type: 'text', text: 'take a look' }, imageBlock()],
    1,
  ),
  true,
  'image without inline placeholder should still render standalone',
)

assert.equal(
  shouldRenderStandaloneUserImage([imageBlock()], 1),
  true,
  'image-only user message should still render standalone',
)

assert.equal(
  shouldRenderStandaloneUserImage(
    [{ type: 'text', text: '[Image #2] only second image is inline' }, imageBlock()],
    1,
  ),
  true,
  'placeholder matching must be image-specific',
)

console.log('user_image_render_selftest: ok')
