import { isIP } from 'node:net'
import type {
  GeminiGroundingMetadata,
  GeminiPart,
  GeminiUrlContextMetadata,
} from './geminiTypes.js'

export type GeminiGroundingSource = {
  title: string
  url: string
}

export type GeminiUrlMetadataEntry = {
  retrievedUrl: string
  urlRetrievalStatus: string | null
}

const GEMINI_UNSUPPORTED_TUNNEL_HOST_SUFFIXES = [
  '.ngrok-free.app',
  '.ngrok.io',
  '.pinggy.link',
  '.loca.lt',
  '.trycloudflare.com',
] as const

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(part => Number(part))
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part))) {
    return false
  }
  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  )
}

export function validateGeminiUrlContextUrls(urls: string[]): string | null {
  if (urls.length === 0) {
    return 'Gemini URL context requires at least one URL.'
  }
  if (urls.length > 20) {
    return 'Gemini URL context supports at most 20 URLs per request.'
  }

  for (const rawUrl of urls) {
    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      return `Gemini URL context received an invalid URL: ${rawUrl}`
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return `Gemini URL context only supports http and https URLs. Unsupported URL: ${rawUrl}`
    }

    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '0.0.0.0'
    ) {
      return `Gemini URL context does not support localhost URLs: ${rawUrl}`
    }

    const ipVersion = isIP(hostname)
    if (
      (ipVersion === 4 && isPrivateIpv4(hostname)) ||
      (ipVersion === 6 && isPrivateIpv6(hostname))
    ) {
      return `Gemini URL context does not support private-network URLs: ${rawUrl}`
    }

    if (
      GEMINI_UNSUPPORTED_TUNNEL_HOST_SUFFIXES.some(suffix =>
        hostname.endsWith(suffix),
      )
    ) {
      return `Gemini URL context does not support tunneling-service URLs: ${rawUrl}`
    }
  }

  return null
}

export function extractGeminiText(parts: GeminiPart[] | undefined): string {
  return (parts ?? [])
    .map(part => part.text)
    .filter((text): text is string => typeof text === 'string' && text.length > 0)
    .join('\n\n')
}

export function collectGeminiGroundingSources(
  metadata: GeminiGroundingMetadata | undefined,
): GeminiGroundingSource[] {
  const deduped = new Map<string, GeminiGroundingSource>()
  for (const chunk of metadata?.groundingChunks ?? []) {
    const url = chunk.web?.uri?.trim()
    if (!url) {
      continue
    }
    deduped.set(url, {
      title: chunk.web?.title?.trim() || url,
      url,
    })
  }
  return [...deduped.values()]
}

export function collectGeminiUrlMetadata(
  metadata: GeminiUrlContextMetadata | undefined,
): GeminiUrlMetadataEntry[] {
  const entries = metadata?.urlMetadata ?? metadata?.url_metadata ?? []
  return entries
    .map(entry => ({
      retrievedUrl: entry.retrievedUrl ?? entry.retrieved_url ?? '',
      urlRetrievalStatus:
        entry.urlRetrievalStatus ?? entry.url_retrieval_status ?? null,
    }))
    .filter(entry => entry.retrievedUrl.length > 0)
}
