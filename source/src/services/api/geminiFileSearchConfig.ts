function splitCsvList(raw: string | undefined): string[] {
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

function normalizeGeminiFileSearchStoreName(value: string): string {
  return value.startsWith('fileSearchStores/')
    ? value
    : `fileSearchStores/${value}`
}

export function getConfiguredGeminiFileSearchStoreNames(): string[] {
  const primary = splitCsvList(process.env.SEATURTLE_GEMINI_FILE_SEARCH_STORE_NAMES)
  if (primary.length > 0) {
    return primary.map(normalizeGeminiFileSearchStoreName)
  }

  return splitCsvList(process.env.CLAUDE_CODE_GEMINI_FILE_SEARCH_STORE_NAMES).map(
    normalizeGeminiFileSearchStoreName,
  )
}

export function getDefaultGeminiFileSearchStoreName(): string | null {
  const configuredDefault =
    process.env.SEATURTLE_GEMINI_FILE_SEARCH_DEFAULT_STORE?.trim() ||
    process.env.CLAUDE_CODE_GEMINI_FILE_SEARCH_DEFAULT_STORE?.trim()

  if (configuredDefault) {
    return normalizeGeminiFileSearchStoreName(configuredDefault)
  }

  return getConfiguredGeminiFileSearchStoreNames()[0] ?? null
}

export function isGeminiHostedFileSearchConfigured(): boolean {
  return getConfiguredGeminiFileSearchStoreNames().length > 0
}
