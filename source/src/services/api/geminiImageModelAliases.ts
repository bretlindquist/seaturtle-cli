const GEMINI_IMAGE_MODEL_ALIASES = new Map<string, string>([
  ['nano-banana', 'gemini-2.5-flash-image'],
  ['nanobanana', 'gemini-2.5-flash-image'],
  ['nano-banana-2', 'gemini-3.1-flash-image-preview'],
  ['nanobanana2', 'gemini-3.1-flash-image-preview'],
  ['nano-banana-pro', 'gemini-3-pro-image-preview'],
  ['nanobananapro', 'gemini-3-pro-image-preview'],
])

function normalizeAliasKey(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
}

export function resolveGeminiImageModelAlias(model: string): string {
  const normalized = normalizeAliasKey(model)
  return GEMINI_IMAGE_MODEL_ALIASES.get(normalized) ?? model.trim()
}

export function getGeminiImageModelAliases(): ReadonlyMap<string, string> {
  return GEMINI_IMAGE_MODEL_ALIASES
}
