import process from 'node:process'
import { getResolvedOpenAiCodexAuth } from '../source/src/services/authProfiles/openaiCodexAuth.js'
import { getOpenAiCodexModelDefinitions } from '../source/src/services/api/openaiCodex.js'
import { parseOpenAiModelDiscoveryResponse } from '../source/src/services/models/providerModelDiscovery.js'

function resolveOpenAiModelsEndpoint(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '')
  return normalized.endsWith('/v1') ? `${normalized}/models` : `${normalized}/v1/models`
}

function isOpenAiCodexMainLoopCandidate(id: string): boolean {
  return /^gpt-5(?:[.-]|$)/.test(id) || /codex/i.test(id)
}

async function main(): Promise<void> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    console.error(
      'OpenAI model discovery audit requires OpenAI auth. Configure an OpenAI API key profile or OPENAI_API_KEY and retry.',
    )
    process.exitCode = 1
    return
  }

  if (auth.mode !== 'api_key') {
    console.error(
      `OpenAI model discovery audit requires API-key auth in this build because the official /v1/models endpoint is not available through ChatGPT-backed OAuth. Active auth source: ${auth.source}.`,
    )
    process.exitCode = 2
    return
  }

  const endpoint = resolveOpenAiModelsEndpoint(auth.baseUrl)
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${auth.apiKey}`,
      ...(auth.organizationId
        ? { 'OpenAI-Organization': auth.organizationId }
        : {}),
      ...(auth.projectId ? { 'OpenAI-Project': auth.projectId } : {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`OpenAI model discovery audit failed: HTTP ${response.status}`)
    if (body.trim()) {
      console.error(body)
    }
    process.exitCode = 3
    return
  }

  const payload = await response.json()
  const discovered = parseOpenAiModelDiscoveryResponse(payload)
  const curated = getOpenAiCodexModelDefinitions().map(model => model.value)
  const curatedSet = new Set(curated)
  const discoveredIds = discovered.map(model => model.id)
  const discoveredSet = new Set(discoveredIds)

  const curatedMissingUpstream = curated.filter(id => !discoveredSet.has(id))
  const upstreamCandidatesMissingCurated = discoveredIds.filter(
    id => isOpenAiCodexMainLoopCandidate(id) && !curatedSet.has(id),
  )

  console.log(
    `OpenAI model discovery audit: ${curated.length} curated models, ${discovered.length} upstream models, ${upstreamCandidatesMissingCurated.length} upstream candidate gaps.`,
  )

  if (curatedMissingUpstream.length > 0) {
    console.log(
      `Curated models missing from upstream: ${curatedMissingUpstream.join(', ')}`,
    )
  }

  if (upstreamCandidatesMissingCurated.length > 0) {
    console.log(
      `Upstream candidate models not yet curated: ${upstreamCandidatesMissingCurated.join(', ')}`,
    )
  }

  if (
    curatedMissingUpstream.length === 0 &&
    upstreamCandidatesMissingCurated.length === 0
  ) {
    console.log('Curated OpenAI model registry matches current upstream candidates.')
    return
  }

  process.exitCode = 4
}

await main()
