export type GeminiProviderBlockMetadata = {
  thoughtSignature?: string
  functionName?: string
  requiresThoughtSignature?: boolean
}

type ProviderMetadataCarrier = {
  providerMetadata?: {
    gemini?: GeminiProviderBlockMetadata
  }
}

function getProviderMetadataCarrier(
  block: unknown,
): ProviderMetadataCarrier | null {
  return typeof block === 'object' && block !== null
    ? (block as ProviderMetadataCarrier)
    : null
}

export function getGeminiProviderBlockMetadata(
  block: unknown,
): GeminiProviderBlockMetadata | null {
  return getProviderMetadataCarrier(block)?.providerMetadata?.gemini ?? null
}

export function getGeminiThoughtSignature(block: unknown): string | undefined {
  const signature = getGeminiProviderBlockMetadata(block)?.thoughtSignature
  return typeof signature === 'string' && signature.length > 0
    ? signature
    : undefined
}

export function getGeminiFunctionName(block: unknown): string | undefined {
  const functionName = getGeminiProviderBlockMetadata(block)?.functionName
  return typeof functionName === 'string' && functionName.length > 0
    ? functionName
    : undefined
}

export function requiresGeminiThoughtSignature(block: unknown): boolean {
  return getGeminiProviderBlockMetadata(block)?.requiresThoughtSignature === true
}

export function withGeminiProviderBlockMetadata<
  T extends Record<string, unknown>,
>(block: T, metadata: GeminiProviderBlockMetadata): T {
  const existing = getProviderMetadataCarrier(block)?.providerMetadata
  return {
    ...block,
    providerMetadata: {
      ...existing,
      gemini: {
        ...existing?.gemini,
        ...metadata,
      },
    },
  }
}
