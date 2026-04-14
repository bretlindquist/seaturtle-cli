import {
  doesEnterpriseMcpConfigExist,
  getMcpConfigsByScope,
} from '../mcp/config.js'
import type {
  McpHTTPServerConfig,
  McpSSEServerConfig,
  ScopedMcpServerConfig,
} from '../mcp/types.js'
import { isRestrictedToPluginOnly } from '../../utils/settings/pluginOnlyPolicy.js'

function splitCsvList(raw: string | undefined): string[] {
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

export function getConfiguredOpenAiVectorStoreIds(): string[] {
  const primary = splitCsvList(process.env.SEATURTLE_OPENAI_VECTOR_STORE_IDS)
  if (primary.length > 0) {
    return primary
  }

  return splitCsvList(process.env.CLAUDE_CODE_OPENAI_VECTOR_STORE_IDS)
}

export function isOpenAiHostedFileSearchConfigured(): boolean {
  return getConfiguredOpenAiVectorStoreIds().length > 0
}

export type OpenAiRemoteMcpServerConfig = {
  name: string
  url: string
  transport: 'http' | 'sse'
}

export function isOpenAiRemoteMcpCompatibleServerConfig(
  config: ScopedMcpServerConfig,
): config is (McpHTTPServerConfig | McpSSEServerConfig) & {
  scope: ScopedMcpServerConfig['scope']
} {
  if (config.type !== 'http' && config.type !== 'sse') {
    return false
  }

  if (config.headersHelper || config.oauth) {
    return false
  }

  if (config.headers && Object.keys(config.headers).length > 0) {
    return false
  }

  return typeof config.url === 'string' && config.url.trim().length > 0
}

function getCandidateRemoteMcpConfigs(): Record<string, ScopedMcpServerConfig> {
  const { servers: enterpriseServers } = getMcpConfigsByScope('enterprise')
  if (doesEnterpriseMcpConfigExist()) {
    return enterpriseServers
  }

  if (isRestrictedToPluginOnly('mcp')) {
    return {}
  }

  const { servers: userServers } = getMcpConfigsByScope('user')
  const { servers: projectServers } = getMcpConfigsByScope('project')
  const { servers: localServers } = getMcpConfigsByScope('local')

  return {
    ...userServers,
    ...projectServers,
    ...localServers,
  }
}

export function getConfiguredOpenAiRemoteMcpServers(): OpenAiRemoteMcpServerConfig[] {
  return Object.entries(getCandidateRemoteMcpConfigs())
    .flatMap(([name, config]) => {
      if (!isOpenAiRemoteMcpCompatibleServerConfig(config)) {
        return []
      }

      return [
        {
          name,
          url: config.url.trim(),
          transport: config.type,
        },
      ]
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function isOpenAiRemoteMcpConfigured(): boolean {
  return getConfiguredOpenAiRemoteMcpServers().length > 0
}
