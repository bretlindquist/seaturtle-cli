import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'

export function shouldRenderStandaloneUserImage(
  content: ContentBlockParam[],
  imageId?: number,
): boolean {
  if (imageId === undefined) {
    return true
  }

  return !content.some(
    (block): boolean =>
      block.type === 'text' && block.text.includes(`[Image #${imageId}]`),
  )
}
