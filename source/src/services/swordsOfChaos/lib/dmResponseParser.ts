import type { SwordsOfChaosDmSceneResponse } from '../types/dm.js'

function isSceneOptionArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        item &&
        typeof item === 'object' &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { value?: unknown }).value === 'string' &&
        typeof (item as { description?: unknown }).description === 'string',
    )
  )
}

export function parseSwordsOfChaosDmSceneResponse(
  input: unknown,
): SwordsOfChaosDmSceneResponse {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid Swords of Chaos DM scene response')
  }

  const value = input as Partial<SwordsOfChaosDmSceneResponse>
  if (
    typeof value.subtitle !== 'string' ||
    typeof value.sceneText !== 'string' ||
    !isSceneOptionArray(value.options)
  ) {
    throw new Error('Invalid Swords of Chaos DM scene response')
  }

  return {
    subtitle: value.subtitle,
    sceneText: value.sceneText,
    options: value.options,
    hintText: typeof value.hintText === 'string' ? value.hintText : undefined,
  }
}
