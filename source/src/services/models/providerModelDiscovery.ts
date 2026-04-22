import type { ProviderModelFamily } from './providerModelRegistry.js'

export type ProviderModelDiscoveryEndpoint = {
  method: 'GET'
  path: string
}

export type ProviderDiscoveredModelEntry = {
  id: string
  displayName?: string
}

export type ProviderModelDiscoverySnapshot = {
  provider: ProviderModelFamily
  endpoint: ProviderModelDiscoveryEndpoint
  authReady: boolean
  discoverySupported: boolean
  refreshStatus: 'ready' | 'auth-required' | 'api-key-required'
  lastRefreshAt: null
  discoveredModelCount: number
}

function normalizeDiscoveredModelEntries(
  entries: ProviderDiscoveredModelEntry[],
): ProviderDiscoveredModelEntry[] {
  const byId = new Map<string, ProviderDiscoveredModelEntry>()
  for (const entry of entries) {
    const id = entry.id.trim()
    if (!id) continue
    if (!byId.has(id)) {
      byId.set(id, { ...entry, id })
    }
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id))
}

export function getProviderModelDiscoveryEndpoint(
  provider: ProviderModelFamily,
): ProviderModelDiscoveryEndpoint {
  switch (provider) {
    case 'anthropic':
      return { method: 'GET', path: '/v1/models' }
    case 'openai-codex':
      return { method: 'GET', path: '/v1/models' }
    case 'gemini':
      return { method: 'GET', path: '/v1beta/models' }
  }
}

export function parseOpenAiModelDiscoveryResponse(
  payload: unknown,
): ProviderDiscoveredModelEntry[] {
  const data =
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray(payload.data)
      ? payload.data
      : []

  return normalizeDiscoveredModelEntries(
    data.flatMap(entry => {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') {
        return []
      }
      return [{ id: entry.id }]
    }),
  )
}

export function parseAnthropicModelDiscoveryResponse(
  payload: unknown,
): ProviderDiscoveredModelEntry[] {
  const data =
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray(payload.data)
      ? payload.data
      : []

  return normalizeDiscoveredModelEntries(
    data.flatMap(entry => {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') {
        return []
      }
      return [
        {
          id: entry.id,
          displayName:
            'display_name' in entry && typeof entry.display_name === 'string'
              ? entry.display_name
              : undefined,
        },
      ]
    }),
  )
}

export function parseGeminiModelDiscoveryResponse(
  payload: unknown,
): ProviderDiscoveredModelEntry[] {
  const models =
    payload &&
    typeof payload === 'object' &&
    'models' in payload &&
    Array.isArray(payload.models)
      ? payload.models
      : []

  return normalizeDiscoveredModelEntries(
    models.flatMap(entry => {
      if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') {
        return []
      }

      const id = entry.name.startsWith('models/')
        ? entry.name.slice('models/'.length)
        : entry.name

      return [
        {
          id,
          displayName:
            'displayName' in entry && typeof entry.displayName === 'string'
              ? entry.displayName
              : undefined,
        },
      ]
    }),
  )
}

export function getProviderModelDiscoverySnapshot(
  provider: ProviderModelFamily,
  authReady: boolean,
  apiKeyReady = false,
): ProviderModelDiscoverySnapshot {
  const refreshStatus =
    provider === 'openai-codex'
      ? apiKeyReady
        ? 'ready'
        : authReady
          ? 'api-key-required'
          : 'auth-required'
      : authReady
        ? 'ready'
        : 'auth-required'

  return {
    provider,
    endpoint: getProviderModelDiscoveryEndpoint(provider),
    authReady,
    discoverySupported: true,
    refreshStatus,
    lastRefreshAt: null,
    discoveredModelCount: 0,
  }
}
