export function getConfiguredGeminiCachedContent(): string | null {
  const value = process.env.SEATURTLE_GEMINI_CACHED_CONTENT?.trim()
  return value ? value : null
}

export function getConfiguredGeminiServiceTier(): string | null {
  const value = process.env.SEATURTLE_GEMINI_SERVICE_TIER?.trim()
  return value ? value : null
}
