export const IMAGE_GENERATION_TOOL_NAME = 'ImageGeneration'

export function getImageGenerationPrompt(): string {
  return `
- Generates a single image using the active provider's routed image generation tool
- Use this when the user explicitly wants a new image, concept art, mockup, illustration, social card, or visual variation rendered
- Keep the prompt concrete and visually specific

Usage notes:
  - This only works when the active SeaTurtle runtime reports routed image generation support
  - On the Gemini path, \`SEATURTLE_GEMINI_IMAGE_MODEL\` accepts Google-style aliases such as \`nano banana\`, \`nano banana 2\`, and \`nano banana pro\`
  - Prefer ordinary image inspection tools for analysis tasks; use this tool only when the user wants a newly generated image
`
}
