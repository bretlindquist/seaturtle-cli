import type {
  BetaContentBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { randomUUID } from 'crypto'
import { API_ERROR_MESSAGE_PREFIX } from './errors.js'
import {
  normalizeOpenAiToolParameterSchema,
  shouldUseStrictOpenAiToolSchema,
} from './openaiToolSchema.js'
import {
  getResolvedOpenAiCodexAuth,
  type OpenAiCodexResolvedAuth,
} from '../authProfiles/openaiCodexAuth.js'
import {
  getConfiguredOpenAiRemoteMcpServers,
  getConfiguredOpenAiVectorStoreIds,
} from './openaiCapabilityConfig.js'
import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
  UserMessage,
} from '../../types/message.js'
import {
  createAssistantAPIErrorMessage,
  createAssistantMessage,
} from '../../utils/messages.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import type { ThinkingConfig } from '../../utils/thinking.js'
import { resolveAppliedEffort } from '../../utils/effort.js'
import type { ToolUseContext, Tools } from '../../Tool.js'
import { zodToJsonSchema } from '../../utils/zodToJsonSchema.js'
import { formatDuration } from '../../utils/format.js'
import type { Options } from './claude.js'
import {
  recordOpenAiCodexTelemetryFromEvent,
  recordOpenAiCodexTelemetryFromHeaders,
} from './openaiCodexTelemetry.js'
import { dispatchComputerUseMcpToolRaw } from '../../utils/computerUse/wrapper.js'
import { cleanupComputerUseAfterTurn } from '../../utils/computerUse/cleanup.js'

export type OpenAiCodexModelDefinition = {
  value: string
  label: string
  description: string
  descriptionForModel: string
}

export type OpenAiCodexModelCapabilities = {
  supportsWebSearch: boolean
  supportsFileSearch: boolean
  supportsMcp: boolean
  supportsToolSearch: boolean
  supportsHostedShell: boolean
  supportsApplyPatch: boolean
  supportsComputerUse: boolean
  supportsSkills: boolean
  supportsCodeInterpreter: boolean
  supportsImageGeneration: boolean
}

export const OPENAI_CODEX_MODEL_DEFINITIONS: readonly OpenAiCodexModelDefinition[] =
  [
    {
      value: 'gpt-5.4',
      label: 'GPT-5.4',
      description: 'Latest frontier agentic coding model',
      descriptionForModel: 'GPT-5.4 - latest frontier agentic coding model',
    },
    {
      value: 'gpt-5.4-mini',
      label: 'GPT-5.4 Mini',
      description: 'Smaller frontier agentic coding model',
      descriptionForModel:
        'GPT-5.4 Mini - smaller frontier agentic coding model',
    },
    {
      value: 'gpt-5.3-codex',
      label: 'GPT-5.3 Codex',
      description: 'Frontier Codex-optimized agentic coding model',
      descriptionForModel:
        'GPT-5.3 Codex - frontier Codex-optimized agentic coding model',
    },
    {
      value: 'gpt-5.2-codex',
      label: 'GPT-5.2 Codex',
      description: 'Frontier agentic coding model',
      descriptionForModel: 'GPT-5.2 Codex - frontier agentic coding model',
    },
    {
      value: 'gpt-5.2',
      label: 'GPT-5.2',
      description: 'Optimized for professional work and long-running agents',
      descriptionForModel:
        'GPT-5.2 - optimized for professional work and long-running agents',
    },
    {
      value: 'gpt-5.1-codex-max',
      label: 'GPT-5.1 Codex Max',
      description: 'Codex-optimized model for deep and fast reasoning',
      descriptionForModel:
        'GPT-5.1 Codex Max - Codex-optimized model for deep and fast reasoning',
    },
    {
      value: 'gpt-5.1-codex-mini',
      label: 'GPT-5.1 Codex Mini',
      description: 'Optimized for codex. Cheaper, faster, but less capable',
      descriptionForModel:
        'GPT-5.1 Codex Mini - optimized for codex. Cheaper, faster, but less capable',
    },
  ] as const

const KNOWN_CHATGPT_CODEX_MODELS = new Set(
  OPENAI_CODEX_MODEL_DEFINITIONS.map(model => model.value),
)

export function getOpenAiCodexModelDefinitions(): readonly OpenAiCodexModelDefinition[] {
  return OPENAI_CODEX_MODEL_DEFINITIONS
}

const FULL_OPENAI_TOOLSTACK_MODELS = new Set(['gpt-5.4', 'gpt-5.4-mini'])
const CODEX_FAMILY_MODELS = new Set([
  'gpt-5.3-codex',
  'gpt-5.2-codex',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex-mini',
])

const ROUTED_OPENAI_CODEX_MODEL_CAPABILITIES: OpenAiCodexModelCapabilities = {
  supportsWebSearch: true,
  supportsFileSearch: true,
  supportsMcp: true,
  supportsToolSearch: false,
  supportsHostedShell: true,
  supportsApplyPatch: false,
  supportsComputerUse: true,
  supportsSkills: false,
  supportsCodeInterpreter: false,
  supportsImageGeneration: true,
}

const FULL_OPENAI_CODEX_MODEL_CAPABILITIES: OpenAiCodexModelCapabilities = {
  supportsWebSearch: true,
  supportsFileSearch: true,
  supportsMcp: true,
  supportsToolSearch: true,
  supportsHostedShell: true,
  supportsApplyPatch: true,
  supportsComputerUse: true,
  supportsSkills: true,
  supportsCodeInterpreter: true,
  supportsImageGeneration: true,
}

const DOC_VERIFIED_FULL_OPENAI_CODEX_MODEL_CAPABILITIES: OpenAiCodexModelCapabilities = {
  supportsWebSearch: true,
  supportsFileSearch: true,
  supportsMcp: true,
  supportsToolSearch: true,
  supportsHostedShell: true,
  supportsApplyPatch: true,
  supportsComputerUse: true,
  supportsSkills: true,
  supportsCodeInterpreter: true,
  supportsImageGeneration: true,
}

const DOC_VERIFIED_CODEX_FAMILY_MODEL_CAPABILITIES: OpenAiCodexModelCapabilities = {
  supportsWebSearch: false,
  supportsFileSearch: false,
  supportsMcp: false,
  supportsToolSearch: false,
  supportsHostedShell: false,
  supportsApplyPatch: false,
  supportsComputerUse: false,
  supportsSkills: false,
  supportsCodeInterpreter: false,
  supportsImageGeneration: false,
}

export function getDocumentedOpenAiCodexModelCapabilities(
  model: string,
): OpenAiCodexModelCapabilities {
  if (FULL_OPENAI_TOOLSTACK_MODELS.has(model)) {
    return DOC_VERIFIED_FULL_OPENAI_CODEX_MODEL_CAPABILITIES
  }

  if (CODEX_FAMILY_MODELS.has(model)) {
    return DOC_VERIFIED_CODEX_FAMILY_MODEL_CAPABILITIES
  }

  return DOC_VERIFIED_CODEX_FAMILY_MODEL_CAPABILITIES
}

export function getRoutedOpenAiCodexModelCapabilities(
  model: string,
): OpenAiCodexModelCapabilities {
  if (FULL_OPENAI_TOOLSTACK_MODELS.has(model) || CODEX_FAMILY_MODELS.has(model)) {
    return ROUTED_OPENAI_CODEX_MODEL_CAPABILITIES
  }

  return DOC_VERIFIED_CODEX_FAMILY_MODEL_CAPABILITIES
}

type OpenAiCodexReasoningPayload = {
  effort: 'low' | 'medium' | 'high' | 'xhigh'
}

type OpenAiCodexRequestTool =
  | {
      type: 'function'
      name: string
      description?: string
      parameters: unknown
      strict?: boolean
    }
  | {
      type: 'mcp'
      server_label: string
      server_description?: string
      server_url: string
      require_approval: 'never'
      allowed_tools?: string[]
    }

type OpenAiCodexTextPart = {
  type: 'input_text' | 'output_text'
  text: string
}

type OpenAiCodexImagePart = {
  type: 'input_image'
  image_url: string
  detail?: 'low' | 'high' | 'auto' | 'original'
}

type OpenAiCodexFilePart = {
  type: 'input_file'
  filename?: string
  file_data: string
}

type OpenAiCodexContentPart =
  | OpenAiCodexTextPart
  | OpenAiCodexImagePart
  | OpenAiCodexFilePart

type OpenAiCodexInputItem = {
  type: 'message'
  role: 'user' | 'assistant'
  content: OpenAiCodexContentPart[]
}

type OpenAiCodexFunctionCallItem = {
  type: 'function_call'
  name: string
  call_id: string
  arguments: string
}

type OpenAiCodexFunctionCallOutputItem = {
  type: 'function_call_output'
  call_id: string
  output: string | OpenAiCodexTextPart[]
}

type OpenAiCodexRequestItem =
  | OpenAiCodexInputItem
  | OpenAiCodexFunctionCallItem
  | OpenAiCodexFunctionCallOutputItem

type ChatgptSseEvent = {
  type?: string
  delta?: string
  item?: unknown
  response?: unknown
}

type OpenAiCodexHttpErrorBody = {
  error?: {
    type?: string
    message?: string
    plan_type?: string | null
    resets_at?: number | string | null
    resets_in_seconds?: number | null
  }
}

export type OpenAiCodexWebSearchResult = {
  outputText: string
  sources: Array<{
    title: string
    url: string
  }>
}

export type OpenAiCodexFileSearchResult = {
  outputText: string
  results: Array<{
    fileId: string | null
    filename: string | null
    score: number | null
    snippet: string | null
  }>
}

export type OpenAiCodexImageGenerationResult = {
  imageBase64: string
  mediaType: string
  revisedPrompt: string | null
}

export type OpenAiCodexHostedShellResult = {
  outputText: string
  outputs: Array<{
    stdout: string
    stderr: string
    exitCode: number | null
    timedOut: boolean
  }>
}

export type OpenAiCodexComputerUseResult = {
  outputText: string
  steps: number
  finalScreenshotBase64: string | null
  finalScreenshotMediaType: string | null
}

type OpenAiCodexComputerAction = {
  type: string
  x?: number
  y?: number
  button?: string
  text?: string
  keys?: string[]
  path?: Array<[number, number] | { x: number; y: number }>
  scrollX?: number
  scrollY?: number
  duration?: number
}

type SyntheticStreamEnvelope = {
  messageId: string
  emittedMessageStart: boolean
  ttftMs?: number
  nextContentBlockIndex: number
  activeTextBlockIndex: number | null
  activeText: string
  completedBlocks: BetaContentBlock[]
  emittedAssistantMessages: AssistantMessage[]
}

type PendingSyntheticToolUse = {
  callId: string
  itemId: string | null
  name: string
  index: number | null
  partialJson: string
  finalArguments: string | null
  finalized: boolean
}

const ZERO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
  service_tier: null,
  cache_creation: {
    ephemeral_1h_input_tokens: 0,
    ephemeral_5m_input_tokens: 0,
  },
  inference_geo: null,
  iterations: null,
  speed: null,
}

function parseOpenAiCodexHttpErrorBody(
  body: string,
): OpenAiCodexHttpErrorBody | null {
  if (!body) {
    return null
  }

  try {
    return JSON.parse(body) as OpenAiCodexHttpErrorBody
  } catch {
    return null
  }
}

function capitalizePlanType(planType: string | null | undefined): string | null {
  if (!planType) {
    return null
  }

  return planType
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part[0]!.toUpperCase() + part.slice(1))
    .join(' ')
}

function formatOpenAiCodexHttpError(params: {
  status: number
  statusText: string
  body: string
}): string {
  const parsed = parseOpenAiCodexHttpErrorBody(params.body)
  const error = parsed?.error

  if (params.status === 429 && error?.type === 'usage_limit_reached') {
    const planLabel = capitalizePlanType(error.plan_type)
    const resetIn =
      typeof error.resets_in_seconds === 'number' && error.resets_in_seconds > 0
        ? formatDuration(error.resets_in_seconds * 1000, {
            hideTrailingZeros: true,
            mostSignificantOnly: false,
          })
        : null
    const resetAt =
      error.resets_at !== null && error.resets_at !== undefined
        ? Number(error.resets_at)
        : null
    const absoluteReset =
      resetAt && Number.isFinite(resetAt)
        ? new Date(resetAt * 1000).toLocaleString()
        : null

    const parts = [
      `${API_ERROR_MESSAGE_PREFIX}: OpenAI/Codex usage limit reached${planLabel ? ` for your ${planLabel} plan` : ''}.`,
      resetIn ? `Try again in about ${resetIn}.` : null,
      absoluteReset ? `Resets at ${absoluteReset}.` : null,
    ].filter(Boolean)

    return parts.join(' ')
  }

  if (typeof error?.message === 'string' && error.message.trim().length > 0) {
    return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText} · ${error.message.trim()}`
  }

  return `${API_ERROR_MESSAGE_PREFIX}: ${params.status} ${params.statusText}${params.body ? ` · ${params.body}` : ''}`
}

function buildOpenAiCodexRequestTarget(
  auth: OpenAiCodexResolvedAuth,
): {
  baseUrl: string
  headers: Record<string, string>
} {
  if (auth.mode === 'api_key') {
    return {
      baseUrl: auth.baseUrl,
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        authorization: `Bearer ${auth.apiKey}`,
        ...(auth.organizationId
          ? { 'OpenAI-Organization': auth.organizationId }
          : {}),
        ...(auth.projectId ? { 'OpenAI-Project': auth.projectId } : {}),
      },
    }
  }

  return {
    baseUrl: auth.baseUrl,
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      authorization: `Bearer ${auth.accessToken}`,
      'ChatGPT-Account-ID': auth.accountId,
      originator: 'claude_code_source_build',
    },
  }
}

function normalizeTextParts(
  content: unknown,
  role: 'user' | 'assistant',
): OpenAiCodexTextPart[] {
  const partType = role === 'assistant' ? 'output_text' : 'input_text'

  if (typeof content === 'string') {
    return content.length > 0 ? [{ type: partType, text: content }] : []
  }

  if (!Array.isArray(content)) {
    return []
  }

  return content.flatMap(part => {
    if (!part || typeof part !== 'object') {
      return []
    }

    const text =
      typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : null
    const type = (part as { type?: unknown }).type

    if (
      text &&
      (type === 'text' || type === 'input_text' || type === 'output_text')
    ) {
      return [{ type: partType, text }]
    }

    return []
  })
}

function flushMessageItem(
  items: OpenAiCodexRequestItem[],
  role: 'user' | 'assistant',
  content: OpenAiCodexContentPart[],
): void {
  if (content.length === 0) {
    return
  }

  items.push({
    type: 'message',
    role,
    content: [...content],
  })
  content.length = 0
}

function convertToolResultContent(
  content: unknown,
): string | OpenAiCodexTextPart[] {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  const parts = content.flatMap(part => {
    if (!part || typeof part !== 'object') {
      return []
    }

    const text =
      typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : null

    if (text) {
      return [{ type: 'input_text' as const, text }]
    }

    if ('content' in part || 'value' in part) {
      return [
        {
          type: 'input_text' as const,
          text: JSON.stringify(part),
        },
      ]
    }

    return []
  })

  return parts.length > 0 ? parts : ''
}

function buildDataUrl(mediaType: string, data: string): string {
  return `data:${mediaType};base64,${data}`
}

function convertUserMultimodalBlock(
  block: Record<string, unknown>,
): OpenAiCodexImagePart | OpenAiCodexFilePart | null {
  const type = block.type
  const source =
    typeof block.source === 'object' && block.source !== null
      ? (block.source as Record<string, unknown>)
      : null

  if (!source || source.type !== 'base64') {
    return null
  }

  const mediaType =
    typeof source.media_type === 'string' ? source.media_type : null
  const data = typeof source.data === 'string' ? source.data : null
  if (!mediaType || !data) {
    return null
  }

  if (type === 'image') {
    return {
      type: 'input_image',
      image_url: buildDataUrl(mediaType, data),
      detail: 'auto',
    }
  }

  if (type === 'document') {
    return {
      type: 'input_file',
      filename:
        typeof block.filename === 'string' && block.filename.trim().length > 0
          ? block.filename.trim()
          : mediaType === 'application/pdf'
            ? 'attachment.pdf'
            : 'attachment.bin',
      file_data: buildDataUrl(mediaType, data),
    }
  }

  return null
}

function convertMessage(
  message: UserMessage | AssistantMessage,
  items: OpenAiCodexRequestItem[],
): void {
  const role = message.type === 'assistant' ? 'assistant' : 'user'
  const contentBlocks = Array.isArray(message.message.content)
    ? message.message.content
    : [{ type: 'text', text: message.message.content }]
  const content: OpenAiCodexContentPart[] = []

  for (const block of contentBlocks) {
    if (!block || typeof block !== 'object') {
      continue
    }

    const type = (block as { type?: unknown }).type
    if (
      typeof (block as { text?: unknown }).text === 'string' &&
      (type === 'text' || type === 'input_text' || type === 'output_text')
    ) {
      content.push(...normalizeTextParts([block], role))
      continue
    }

    if (role === 'user') {
      const convertedMultimodalBlock = convertUserMultimodalBlock(
        block as Record<string, unknown>,
      )
      if (convertedMultimodalBlock) {
        content.push(convertedMultimodalBlock)
        continue
      }
    }

    if (type === 'tool_use' && role === 'assistant') {
      flushMessageItem(items, role, content)
      items.push({
        type: 'function_call',
        name:
          typeof (block as { name?: unknown }).name === 'string'
            ? (block as { name: string }).name
            : 'unknown_tool',
        call_id:
          typeof (block as { id?: unknown }).id === 'string'
            ? (block as { id: string }).id
            : 'missing_tool_id',
        arguments: JSON.stringify(
          typeof (block as { input?: unknown }).input === 'object' &&
            (block as { input?: unknown }).input !== null
            ? (block as { input: unknown }).input
            : {},
        ),
      })
      continue
    }

    if (type === 'tool_result' && role === 'user') {
      flushMessageItem(items, role, content)
      items.push({
        type: 'function_call_output',
        call_id:
          typeof (block as { tool_use_id?: unknown }).tool_use_id === 'string'
            ? (block as { tool_use_id: string }).tool_use_id
            : 'missing_tool_result_id',
        output: convertToolResultContent(
          (block as { content?: unknown }).content,
        ),
      })
    }
  }

  flushMessageItem(items, role, content)
}

export function collectOpenAiCodexInputItems(
  messages: Message[],
): OpenAiCodexRequestItem[] {
  const items: OpenAiCodexRequestItem[] = []
  for (const message of messages) {
    if (message.type !== 'user' && message.type !== 'assistant') {
      continue
    }
    convertMessage(message, items)
  }
  return items
}

function buildSingleTurnOpenAiCodexInput(
  text: string,
): OpenAiCodexRequestItem[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return []
  }

  return [
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: trimmed }],
    },
  ]
}

async function buildOpenAiCodexTools(params: {
  tools: Tools
}): Promise<OpenAiCodexRequestTool[]> {
  const remoteMcpConfigs = new Map(
    getConfiguredOpenAiRemoteMcpServers().map(config => [config.name, config]),
  )
  const remoteMcpAllowedTools = new Map<string, Set<string>>()
  const convertedTools: OpenAiCodexRequestTool[] = []

  for (const tool of params.tools) {
    const remoteMcpServerName = tool.mcpInfo?.serverName
    if (remoteMcpServerName) {
      const remoteMcpConfig = remoteMcpConfigs.get(remoteMcpServerName)
      if (remoteMcpConfig) {
        const allowedTools =
          remoteMcpAllowedTools.get(remoteMcpServerName) ?? new Set<string>()
        if (tool.mcpInfo.toolName) {
          allowedTools.add(tool.mcpInfo.toolName)
        }
        remoteMcpAllowedTools.set(remoteMcpServerName, allowedTools)
        continue
      }
    }

    if (typeof tool.name !== 'string' || !tool.name) {
      continue
    }

    const schema =
      'inputJSONSchema' in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : zodToJsonSchema(tool.inputSchema)

    const parameters = normalizeOpenAiToolParameterSchema(schema ?? {})

    convertedTools.push({
      type: 'function' as const,
      name: tool.name,
      parameters,
      ...(shouldUseStrictOpenAiToolSchema({
        toolName: tool.name,
        strict: tool.strict,
        parameters,
      })
        ? { strict: true }
        : {}),
    })
  }

  for (const [serverName, allowedTools] of remoteMcpAllowedTools.entries()) {
    const remoteMcpConfig = remoteMcpConfigs.get(serverName)
    if (!remoteMcpConfig) {
      continue
    }

    convertedTools.push({
      type: 'mcp',
      server_label: serverName,
      server_description: `SeaTurtle MCP server: ${serverName}`,
      server_url: remoteMcpConfig.url,
      require_approval: 'never',
      ...(allowedTools.size > 0 ? { allowed_tools: [...allowedTools].sort() } : {}),
    })
  }

  return convertedTools
}

function buildInstructions(systemPrompt: SystemPrompt): string {
  return systemPrompt.join('\n\n').trim()
}

function responsesEndpoint(baseUrl: string): string {
  return baseUrl.endsWith('/responses') ? baseUrl : `${baseUrl}/responses`
}

function normalizeWebSearchDomain(domain: string): string | null {
  const trimmed = domain.trim()
  if (!trimmed) {
    return null
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '')
  const normalized = withoutProtocol.replace(/\/+$/, '')
  return normalized || null
}

function collectWebSearchSources(value: unknown): Array<{ title: string; url: string }> {
  const collected = new Map<string, { title: string; url: string }>()

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item)
      }
      return
    }

    const record = node as Record<string, unknown>
    const maybeUrl = typeof record.url === 'string' ? record.url.trim() : null
    if (maybeUrl) {
      const title =
        typeof record.title === 'string' && record.title.trim().length > 0
          ? record.title.trim()
          : maybeUrl
      if (!collected.has(maybeUrl)) {
        collected.set(maybeUrl, { title, url: maybeUrl })
      }
    }

    for (const child of Object.values(record)) {
      walk(child)
    }
  }

  walk(value)
  return [...collected.values()]
}

function collectFileSearchResults(
  value: unknown,
): Array<{
  fileId: string | null
  filename: string | null
  score: number | null
  snippet: string | null
}> {
  const collected = new Map<
    string,
    {
      fileId: string | null
      filename: string | null
      score: number | null
      snippet: string | null
    }
  >()

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item)
      }
      return
    }

    const record = node as Record<string, unknown>
    const fileId =
      typeof record.file_id === 'string' && record.file_id.trim().length > 0
        ? record.file_id.trim()
        : null
    const filename =
      typeof record.filename === 'string' && record.filename.trim().length > 0
        ? record.filename.trim()
        : null
    const score =
      typeof record.score === 'number' && Number.isFinite(record.score)
        ? record.score
        : null

    let snippet: string | null = null
    if (typeof record.text === 'string' && record.text.trim().length > 0) {
      snippet = record.text.trim()
    } else if (Array.isArray(record.content)) {
      snippet = record.content
        .flatMap(item => {
          if (!item || typeof item !== 'object') {
            return []
          }
          return typeof (item as { text?: unknown }).text === 'string'
            ? [((item as { text: string }).text || '').trim()]
            : []
        })
        .filter(Boolean)
        .join('\n')
    }

    if (fileId || filename || snippet || score !== null) {
      const key = fileId ?? filename ?? `${collected.size}`
      if (!collected.has(key)) {
        collected.set(key, {
          fileId,
          filename,
          score,
          snippet: snippet || null,
        })
      }
    }

    for (const child of Object.values(record)) {
      walk(child)
    }
  }

  walk(value)
  return [...collected.values()]
}

function collectImageGenerationResult(
  value: unknown,
): OpenAiCodexImageGenerationResult | null {
  function walk(node: unknown): OpenAiCodexImageGenerationResult | null {
    if (!node || typeof node !== 'object') {
      return null
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item)
        if (found) {
          return found
        }
      }
      return null
    }

    const record = node as Record<string, unknown>
    const type =
      typeof record.type === 'string' ? record.type.trim().toLowerCase() : ''

    if (type === 'image_generation_call') {
      const result =
        typeof record.result === 'string' && record.result.trim().length > 0
          ? record.result.trim()
          : null
      if (result) {
        return {
          imageBase64: result,
          mediaType: 'image/png',
          revisedPrompt:
            typeof record.revised_prompt === 'string' &&
            record.revised_prompt.trim().length > 0
              ? record.revised_prompt.trim()
              : null,
        }
      }
    }

    for (const child of Object.values(record)) {
      const found = walk(child)
      if (found) {
        return found
      }
    }

    return null
  }

  return walk(value)
}

function collectHostedShellOutputs(
  value: unknown,
): Array<{
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
}> {
  const outputs: Array<{
    stdout: string
    stderr: string
    exitCode: number | null
    timedOut: boolean
  }> = []

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item)
      }
      return
    }

    const record = node as Record<string, unknown>
    const type =
      typeof record.type === 'string' ? record.type.trim().toLowerCase() : ''

    if (type === 'shell_call_output' && Array.isArray(record.output)) {
      for (const item of record.output) {
        if (!item || typeof item !== 'object') {
          continue
        }
        const output = item as Record<string, unknown>
        const outcome =
          output.outcome && typeof output.outcome === 'object'
            ? (output.outcome as Record<string, unknown>)
            : null
        const outcomeType =
          outcome && typeof outcome.type === 'string'
            ? outcome.type.trim().toLowerCase()
            : ''
        outputs.push({
          stdout:
            typeof output.stdout === 'string' ? output.stdout : '',
          stderr:
            typeof output.stderr === 'string' ? output.stderr : '',
          exitCode:
            outcome &&
            typeof outcome.exit_code === 'number' &&
            Number.isFinite(outcome.exit_code)
              ? outcome.exit_code
              : null,
          timedOut: outcomeType === 'timeout',
        })
      }
    }

    for (const child of Object.values(record)) {
      walk(child)
    }
  }

  walk(value)
  return outputs
}

function collectComputerCall(
  value: unknown,
): { callId: string; actions: OpenAiCodexComputerAction[] } | null {
  function walk(node: unknown): { callId: string; actions: OpenAiCodexComputerAction[] } | null {
    if (!node || typeof node !== 'object') {
      return null
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item)
        if (found) {
          return found
        }
      }
      return null
    }

    const record = node as Record<string, unknown>
    const type =
      typeof record.type === 'string' ? record.type.trim().toLowerCase() : ''

    if (type === 'computer_call') {
      const callId =
        typeof record.call_id === 'string' && record.call_id.trim().length > 0
          ? record.call_id.trim()
          : null
      const actions = Array.isArray(record.actions)
        ? record.actions.filter(
            (action): action is OpenAiCodexComputerAction =>
              !!action && typeof action === 'object',
          )
        : []
      if (callId) {
        return { callId, actions }
      }
    }

    for (const child of Object.values(record)) {
      const found = walk(child)
      if (found) {
        return found
      }
    }

    return null
  }

  return walk(value)
}

function collectResponseId(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const id = (value as { id?: unknown }).id
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null
}

function collectOutputText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const outputText = (value as { output_text?: unknown }).output_text
  return typeof outputText === 'string' ? outputText.trim() : ''
}

function extractComputerScreenshot(
  result: unknown,
): { base64: string; mediaType: string } | null {
  if (!result || typeof result !== 'object') {
    return null
  }

  const content = (result as { content?: unknown }).content
  if (!Array.isArray(content)) {
    return null
  }

  for (const item of content) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const record = item as Record<string, unknown>
    if (
      record.type === 'image' &&
      typeof record.data === 'string' &&
      record.data.length > 0
    ) {
      return {
        base64: record.data,
        mediaType:
          typeof record.mimeType === 'string' && record.mimeType.length > 0
            ? record.mimeType
            : 'image/jpeg',
      }
    }
  }

  return null
}

function normalizeComputerActionCoordinate(
  value: unknown,
): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0])
    const y = Number(value[1])
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return [Math.round(x), Math.round(y)]
    }
    return null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const x = Number(record.x)
  const y = Number(record.y)
  return Number.isFinite(x) && Number.isFinite(y)
    ? [Math.round(x), Math.round(y)]
    : null
}

function keyListToChord(keys: string[] | undefined): string | undefined {
  if (!Array.isArray(keys) || keys.length === 0) {
    return undefined
  }

  const normalized = keys
    .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
    .map(key => key.trim())
  return normalized.length > 0 ? normalized.join('+') : undefined
}

async function runComputerUseAction(
  action: OpenAiCodexComputerAction,
  context: ToolUseContext,
): Promise<unknown> {
  switch (action.type) {
    case 'screenshot':
      return dispatchComputerUseMcpToolRaw('screenshot', {}, context)
    case 'click': {
      const coordinate =
        Number.isFinite(action.x) && Number.isFinite(action.y)
          ? [Math.round(action.x!), Math.round(action.y!)]
          : null
      if (!coordinate) {
        throw new Error('OpenAI computer action is missing click coordinates')
      }
      const toolName =
        action.button === 'right'
          ? 'right_click'
          : action.button === 'middle'
            ? 'middle_click'
            : 'left_click'
      const text = keyListToChord(action.keys)
      return dispatchComputerUseMcpToolRaw(
        toolName,
        text ? { coordinate, text } : { coordinate },
        context,
      )
    }
    case 'double_click': {
      const coordinate =
        Number.isFinite(action.x) && Number.isFinite(action.y)
          ? [Math.round(action.x!), Math.round(action.y!)]
          : null
      if (!coordinate) {
        throw new Error('OpenAI computer action is missing double-click coordinates')
      }
      const text = keyListToChord(action.keys)
      return dispatchComputerUseMcpToolRaw(
        'double_click',
        text ? { coordinate, text } : { coordinate },
        context,
      )
    }
    case 'move': {
      const coordinate =
        Number.isFinite(action.x) && Number.isFinite(action.y)
          ? [Math.round(action.x!), Math.round(action.y!)]
          : null
      if (!coordinate) {
        throw new Error('OpenAI computer action is missing move coordinates')
      }
      return dispatchComputerUseMcpToolRaw('mouse_move', { coordinate }, context)
    }
    case 'drag': {
      const path = Array.isArray(action.path)
        ? action.path
            .map(normalizeComputerActionCoordinate)
            .filter((value): value is [number, number] => value !== null)
        : []
      if (path.length < 2) {
        throw new Error('OpenAI computer drag action requires at least two path points')
      }
      return dispatchComputerUseMcpToolRaw(
        'left_click_drag',
        {
          start_coordinate: path[0],
          coordinate: path[path.length - 1],
        },
        context,
      )
    }
    case 'scroll': {
      const coordinate =
        Number.isFinite(action.x) && Number.isFinite(action.y)
          ? [Math.round(action.x!), Math.round(action.y!)]
          : null
      if (!coordinate) {
        throw new Error('OpenAI computer action is missing scroll coordinates')
      }
      const directions: Array<Promise<unknown>> = []
      const scrollX =
        typeof action.scrollX === 'number' && Number.isFinite(action.scrollX)
          ? action.scrollX
          : 0
      const scrollY =
        typeof action.scrollY === 'number' && Number.isFinite(action.scrollY)
          ? action.scrollY
          : 0
      const modifierText = keyListToChord(action.keys)
      const callScroll = (
        scroll_direction: 'up' | 'down' | 'left' | 'right',
        scroll_amount: number,
      ) =>
        dispatchComputerUseMcpToolRaw(
          'scroll',
          {
            coordinate,
            scroll_direction,
            scroll_amount,
            ...(modifierText ? { text: modifierText } : {}),
          },
          context,
        )

      if (scrollY !== 0) {
        directions.push(
          callScroll(scrollY < 0 ? 'up' : 'down', Math.max(1, Math.round(Math.abs(scrollY) / 100))),
        )
      }
      if (scrollX !== 0) {
        directions.push(
          callScroll(scrollX < 0 ? 'left' : 'right', Math.max(1, Math.round(Math.abs(scrollX) / 100))),
        )
      }
      let lastResult: unknown = null
      for (const resultPromise of directions) {
        lastResult = await resultPromise
      }
      return lastResult
    }
    case 'keypress': {
      const text = keyListToChord(action.keys)
      if (!text) {
        throw new Error('OpenAI computer keypress action is missing keys')
      }
      return dispatchComputerUseMcpToolRaw('key', { text }, context)
    }
    case 'type':
      if (typeof action.text !== 'string' || action.text.length === 0) {
        throw new Error('OpenAI computer type action is missing text')
      }
      return dispatchComputerUseMcpToolRaw('type', { text: action.text }, context)
    case 'wait':
      return dispatchComputerUseMcpToolRaw(
        'wait',
        {
          duration:
            typeof action.duration === 'number' && Number.isFinite(action.duration)
              ? Math.max(0, Math.min(100, action.duration))
              : 1,
        },
        context,
      )
    default:
      throw new Error(`Unsupported OpenAI computer action: ${action.type}`)
  }
}

function buildOpenAiCodexReasoningPayload(options: Options):
  | OpenAiCodexReasoningPayload
  | undefined {
  const resolvedEffort = resolveAppliedEffort(options.model, options.effortValue)
  if (resolvedEffort === undefined || typeof resolvedEffort !== 'string') {
    return undefined
  }

  return {
    effort: resolvedEffort === 'max' ? 'xhigh' : resolvedEffort,
  }
}

function parseSsePayload(frame: string): string | null {
  const lines = frame
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)

  const dataLines = lines
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).trim())

  if (dataLines.length === 0) {
    return null
  }

  const payload = dataLines.join('\n')
  return payload === '[DONE]' ? null : payload
}

function nextSseFrame(buffer: string): { frame: string; rest: string } | null {
  const index = buffer.search(/\r?\n\r?\n/)
  if (index === -1) {
    return null
  }

  const separatorMatch = buffer.slice(index).match(/^\r?\n\r?\n/)
  const separatorLength = separatorMatch?.[0].length ?? 2
  return {
    frame: buffer.slice(0, index),
    rest: buffer.slice(index + separatorLength),
  }
}

function outputItemText(item: unknown): string {
  if (!item || typeof item !== 'object') {
    return ''
  }

  const content = (item as { content?: unknown }).content
  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .flatMap(part => {
      if (!part || typeof part !== 'object') {
        return []
      }
      return (part as { type?: unknown; text?: unknown }).type === 'output_text' &&
        typeof (part as { text?: unknown }).text === 'string'
        ? [(part as { text: string }).text]
        : []
    })
    .join('')
}

function parseFunctionCallInput(argumentsPayload: unknown): Record<string, unknown> {
  if (typeof argumentsPayload !== 'string' || argumentsPayload.trim().length === 0) {
    return {}
  }

  try {
    const parsed = JSON.parse(argumentsPayload)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

async function* emitSyntheticStreamEvent(
  part: Record<string, unknown>,
  envelope: SyntheticStreamEnvelope,
  startTime: number,
): AsyncGenerator<StreamEvent, void> {
  if (part.type === 'message_start') {
    envelope.ttftMs = Date.now() - startTime
  }

  yield {
    type: 'stream_event',
    event: part as StreamEvent['event'],
    ...(part.type === 'message_start' && envelope.ttftMs != null
      ? { ttftMs: envelope.ttftMs }
      : {}),
  }
}

async function* ensureSyntheticMessageStart(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
): AsyncGenerator<StreamEvent, void> {
  if (envelope.emittedMessageStart) {
    return
  }

  envelope.emittedMessageStart = true
  yield* emitSyntheticStreamEvent(
    {
      type: 'message_start',
      message: {
        id: envelope.messageId,
        type: 'message',
        role: 'assistant',
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { ...ZERO_USAGE },
        container: null,
        context_management: null,
      },
    },
    envelope,
    startTime,
  )
}

async function* ensureSyntheticTextBlockStart(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
): AsyncGenerator<StreamEvent, void> {
  yield* ensureSyntheticMessageStart(envelope, startTime, model)
  if (envelope.activeTextBlockIndex != null) {
    return
  }

  envelope.activeTextBlockIndex = envelope.nextContentBlockIndex++
  envelope.activeText = ''
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_start',
      index: envelope.activeTextBlockIndex,
      content_block: {
        type: 'text',
        text: '',
      },
    },
    envelope,
    startTime,
  )
}

async function* flushSyntheticTextBlock(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (envelope.activeTextBlockIndex == null || envelope.activeText.length === 0) {
    envelope.activeTextBlockIndex = null
    envelope.activeText = ''
    return
  }

  const contentBlock: BetaContentBlock = {
    type: 'text',
    text: envelope.activeText,
  } as BetaContentBlock
  envelope.completedBlocks.push(contentBlock)

  const assistantMessage = createAssistantMessage({
    content: [contentBlock],
  })
  assistantMessage.message.stop_reason = null
  envelope.emittedAssistantMessages.push(assistantMessage)

  yield assistantMessage
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_stop',
      index: envelope.activeTextBlockIndex,
    },
    envelope,
    startTime,
  )

  envelope.activeTextBlockIndex = null
  envelope.activeText = ''
}

async function* emitSyntheticToolUse(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  item: {
    call_id?: unknown
    name?: unknown
    arguments?: unknown
  },
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  yield* flushSyntheticTextBlock(envelope, startTime)
  yield* ensureSyntheticMessageStart(envelope, startTime, model)

  const index = envelope.nextContentBlockIndex++
  const callId =
    typeof item.call_id === 'string' ? item.call_id : 'missing_tool_id'
  const name = typeof item.name === 'string' ? item.name : 'unknown_tool'
  const partialJson =
    typeof item.arguments === 'string' ? item.arguments : '{}'
  const contentBlock: BetaContentBlock = {
    type: 'tool_use',
    id: callId,
    name,
    input: parseFunctionCallInput(item.arguments),
  } as BetaContentBlock

  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_start',
      index,
      content_block: {
        type: 'tool_use',
        id: callId,
        name,
        input: {},
      },
    },
    envelope,
    startTime,
  )
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_delta',
      index,
      delta: {
        type: 'input_json_delta',
        partial_json: partialJson,
      },
    },
    envelope,
    startTime,
  )

  const assistantMessage = createAssistantMessage({
    content: [contentBlock],
  })
  assistantMessage.message.stop_reason = null
  envelope.completedBlocks.push(contentBlock)
  envelope.emittedAssistantMessages.push(assistantMessage)
  yield assistantMessage

  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_stop',
      index,
    },
    envelope,
    startTime,
  )
}

async function* ensureSyntheticToolUseStart(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  yield* flushSyntheticTextBlock(envelope, startTime)
  yield* ensureSyntheticMessageStart(envelope, startTime, model)

  if (pendingToolUse.index != null) {
    return
  }

  pendingToolUse.index = envelope.nextContentBlockIndex++
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_start',
      index: pendingToolUse.index,
      content_block: {
        type: 'tool_use',
        id: pendingToolUse.callId,
        name: pendingToolUse.name,
        input: {},
      },
    },
    envelope,
    startTime,
  )
}

function canRenderPendingSyntheticToolUse(
  pendingToolUse: PendingSyntheticToolUse,
): boolean {
  return (
    pendingToolUse.callId !== 'missing_tool_id' &&
    pendingToolUse.name !== 'unknown_tool'
  )
}

function mergePendingSyntheticToolUseMetadata(
  pendingToolUse: PendingSyntheticToolUse,
  item: {
    id?: unknown
    name?: unknown
    arguments?: unknown
  },
): void {
  if (typeof item.id === 'string') {
    pendingToolUse.itemId = item.id
  }

  if (typeof item.name === 'string') {
    pendingToolUse.name = item.name
  }

  if (
    pendingToolUse.partialJson.length === 0 &&
    typeof item.arguments === 'string'
  ) {
    pendingToolUse.partialJson = item.arguments
  }
}

async function* flushBufferedSyntheticToolUseDelta(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
  latestDelta?: string,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (
    !canRenderPendingSyntheticToolUse(pendingToolUse) ||
    pendingToolUse.partialJson.length === 0
  ) {
    return
  }

  const shouldEmitFullBuffer = pendingToolUse.index == null
  yield* ensureSyntheticToolUseStart(
    envelope,
    startTime,
    model,
    pendingToolUse,
  )

  const partialJson = shouldEmitFullBuffer
    ? pendingToolUse.partialJson
    : (latestDelta ?? '')
  if (partialJson.length === 0) {
    return
  }

  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_delta',
      index: pendingToolUse.index ?? 0,
      delta: {
        type: 'input_json_delta',
        partial_json: partialJson,
      },
    },
    envelope,
    startTime,
  )
}

async function* emitSyntheticToolUseDelta(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
  delta: string,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (delta.length === 0) {
    return
  }

  pendingToolUse.partialJson += delta
  yield* flushBufferedSyntheticToolUseDelta(
    envelope,
    startTime,
    model,
    pendingToolUse,
    delta,
  )
}

async function* finalizeSyntheticToolUse(
  envelope: SyntheticStreamEnvelope,
  startTime: number,
  model: string,
  pendingToolUse: PendingSyntheticToolUse,
  finalArguments?: string,
): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  if (pendingToolUse.finalized) {
    return
  }

  const finalJson =
    typeof finalArguments === 'string'
      ? finalArguments
      : pendingToolUse.partialJson

  if (!canRenderPendingSyntheticToolUse(pendingToolUse)) {
    pendingToolUse.partialJson = finalJson
    pendingToolUse.finalArguments = finalJson
    return
  }

  const shouldEmitFullBuffer = pendingToolUse.index == null
  yield* ensureSyntheticToolUseStart(
    envelope,
    startTime,
    model,
    pendingToolUse,
  )

  if (
    shouldEmitFullBuffer &&
    finalJson.length > 0
  ) {
    pendingToolUse.partialJson = finalJson
    yield* emitSyntheticStreamEvent(
      {
        type: 'content_block_delta',
        index: pendingToolUse.index ?? 0,
        delta: {
          type: 'input_json_delta',
          partial_json: finalJson,
        },
      },
      envelope,
      startTime,
    )
  } else if (
    finalJson.length > pendingToolUse.partialJson.length &&
    finalJson.startsWith(pendingToolUse.partialJson)
  ) {
    const delta = finalJson.slice(pendingToolUse.partialJson.length)
    pendingToolUse.partialJson = finalJson
    yield* emitSyntheticStreamEvent(
      {
        type: 'content_block_delta',
        index: pendingToolUse.index ?? 0,
        delta: {
          type: 'input_json_delta',
          partial_json: delta,
        },
      },
      envelope,
      startTime,
    )
  } else if (pendingToolUse.partialJson.length === 0) {
    pendingToolUse.partialJson = finalJson
    if (finalJson.length > 0) {
      yield* emitSyntheticStreamEvent(
        {
          type: 'content_block_delta',
          index: pendingToolUse.index ?? 0,
          delta: {
            type: 'input_json_delta',
            partial_json: finalJson,
          },
        },
        envelope,
        startTime,
      )
    }
  }

  const contentBlock: BetaContentBlock = {
    type: 'tool_use',
    id: pendingToolUse.callId,
    name: pendingToolUse.name,
    input: parseFunctionCallInput(pendingToolUse.partialJson),
  } as BetaContentBlock
  const assistantMessage = createAssistantMessage({
    content: [contentBlock],
  })
  assistantMessage.message.stop_reason = null

  envelope.completedBlocks.push(contentBlock)
  envelope.emittedAssistantMessages.push(assistantMessage)
  pendingToolUse.finalized = true

  yield assistantMessage
  yield* emitSyntheticStreamEvent(
    {
      type: 'content_block_stop',
      index: pendingToolUse.index ?? 0,
    },
    envelope,
    startTime,
  )
}

async function collectChatgptCodexText(params: {
  auth: OpenAiCodexResolvedAuth
  messages: Message[]
  systemPrompt: SystemPrompt
  signal: AbortSignal
  model: string
  tools: Tools
  options: Options
}): Promise<BetaContentBlock[]> {
  const input = collectOpenAiCodexInputItems(params.messages)
  if (input.length === 0) {
    throw new Error('OpenAI/Codex request is missing input messages')
  }
  const tools = await buildOpenAiCodexTools({
    tools: params.tools,
  })
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)
  const requestTarget = buildOpenAiCodexRequestTarget(params.auth)

  const response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
    method: 'POST',
    headers: requestTarget.headers,
    body: JSON.stringify({
      model: params.model,
      instructions: buildInstructions(params.systemPrompt),
      input,
      tools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
      ...(reasoning ? { reasoning } : {}),
      store: false,
      stream: true,
      include: ['reasoning.encrypted_content'],
    }),
    signal: params.signal,
  })

  recordOpenAiCodexTelemetryFromHeaders(response.headers)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      formatOpenAiCodexHttpError({
        status: response.status,
        statusText: response.statusText,
        body,
      }),
    )
  }

  const raw = await response.text()
  let remainder = raw
  let pendingText = ''
  const content: BetaContentBlock[] = []

  while (true) {
    const frame = nextSseFrame(remainder)
    if (!frame) {
      break
    }
    remainder = frame.rest
    const payload = parseSsePayload(frame.frame)
    if (!payload) {
      continue
    }

    const event = JSON.parse(payload) as ChatgptSseEvent
    if (
      event.type === 'response.created' ||
      event.type === 'response.in_progress'
    ) {
      recordOpenAiCodexTelemetryFromEvent(event)
    }
    switch (event.type) {
      case 'response.output_text.delta':
        if (typeof event.delta === 'string') {
          pendingText += event.delta
        }
        break
      case 'response.output_item.done': {
        const itemText = outputItemText(event.item)
        const itemType =
          event.item && typeof event.item === 'object'
            ? (event.item as { type?: unknown }).type
            : null
        if (itemType === 'function_call') {
          if (pendingText.length > 0) {
            content.push({
              type: 'text',
              text: pendingText,
            } as BetaContentBlock)
            pendingText = ''
          }
          const item = event.item as {
            call_id?: unknown
            name?: unknown
            arguments?: unknown
          }
          content.push({
            type: 'tool_use',
            id:
              typeof item.call_id === 'string'
                ? item.call_id
                : 'missing_tool_id',
            name:
              typeof item.name === 'string' ? item.name : 'unknown_tool',
            input:
              typeof item.arguments === 'string' && item.arguments.trim().length > 0
                ? JSON.parse(item.arguments)
                : {},
          } as BetaContentBlock)
        } else if (pendingText.length > 0) {
          content.push({
            type: 'text',
            text: pendingText,
          } as BetaContentBlock)
          pendingText = ''
        } else if (itemText.length > 0) {
          content.push({
            type: 'text',
            text: itemText,
          } as BetaContentBlock)
        }
        break
      }
      case 'response.failed': {
        const message =
          event.response &&
          typeof event.response === 'object' &&
          typeof (event.response as { error?: { message?: unknown } }).error
            ?.message === 'string'
            ? ((event.response as { error: { message: string } }).error.message)
            : 'OpenAI/Codex backend returned response.failed'
        throw new Error(message)
      }
      case 'response.incomplete':
        throw new Error('OpenAI/Codex backend returned an incomplete response')
      default:
        break
    }
  }

  if (pendingText.length > 0) {
    content.push({
      type: 'text',
      text: pendingText,
    } as BetaContentBlock)
  }

  if (content.length === 0) {
    throw new Error('OpenAI/Codex backend returned no assistant content')
  }

  return content
}

export function validateOpenAiCodexModel(model: string): string | null {
  return KNOWN_CHATGPT_CODEX_MODELS.has(model)
    ? null
    : `model \`${model}\` is not available through ChatGPT-backed Codex OAuth in this build. Supported models: ${OPENAI_CODEX_MODEL_DEFINITIONS.map(item => `\`${item.value}\``).join(', ')}.`
}

async function runOpenAiCodexPlainText(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  signal: AbortSignal
  model: string
  tools: Tools
  options: Options
}): Promise<AssistantMessage> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    return createAssistantAPIErrorMessage({
      content:
        'OpenAI/Codex auth is not configured. Sign in through CT, set OPENAI_API_KEY, or link legacy Codex CLI auth, then retry with `SEATURTLE_USE_OPENAI_CODEX=1`.',
    })
  }

  const modelError = validateOpenAiCodexModel(params.model)
  if (modelError) {
    return createAssistantAPIErrorMessage({
      content: modelError,
    })
  }

  try {
    const text = await collectChatgptCodexText({
      tools: params.tools,
      options: params.options,
      auth,
      messages: params.messages,
      systemPrompt: params.systemPrompt,
      signal: params.signal,
      model: params.model,
    })
    return createAssistantMessage({ content: text })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createAssistantAPIErrorMessage({
      content: message.startsWith(API_ERROR_MESSAGE_PREFIX)
        ? message
        : `${API_ERROR_MESSAGE_PREFIX}: ${message}`,
    })
  }
}

export async function queryOpenAiCodexWithoutStreaming(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): Promise<AssistantMessage> {
  return runOpenAiCodexPlainText({
    messages: params.messages,
    systemPrompt: params.systemPrompt,
    signal: params.signal,
    model: params.options.model,
    tools: params.tools,
    options: params.options,
  })
}

export async function runOpenAiCodexWebSearch(params: {
  model: string
  query: string
  allowedDomains?: string[]
  signal: AbortSignal
  options: Options
}): Promise<OpenAiCodexWebSearchResult> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    throw new Error(
      'OpenAI/Codex auth is not configured. Sign in through CT, set OPENAI_API_KEY, or link legacy Codex CLI auth, then retry with `SEATURTLE_USE_OPENAI_CODEX=1`.',
    )
  }

  const modelError = validateOpenAiCodexModel(params.model)
  if (modelError) {
    throw new Error(modelError)
  }

  const requestTarget = buildOpenAiCodexRequestTarget(auth)
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)
  const input = buildSingleTurnOpenAiCodexInput(params.query)
  if (input.length === 0) {
    throw new Error('OpenAI/Codex web search request is missing query input')
  }
  const allowedDomains = (params.allowedDomains ?? [])
    .map(normalizeWebSearchDomain)
    .filter((domain): domain is string => !!domain)

  const response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
    method: 'POST',
    headers: requestTarget.headers,
    body: JSON.stringify({
      model: params.model,
      instructions:
        'Use the web_search tool to answer the user query. Return a concise, source-backed result.',
      input,
      tools: [
        {
          type: 'web_search',
          ...(allowedDomains.length > 0
            ? {
                filters: {
                  allowed_domains: allowedDomains,
                },
              }
            : {}),
        },
      ],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      ...(reasoning ? { reasoning } : {}),
      store: false,
      stream: true,
    }),
    signal: params.signal,
  })

  recordOpenAiCodexTelemetryFromHeaders(response.headers)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      formatOpenAiCodexHttpError({
        status: response.status,
        statusText: response.statusText,
        body,
      }),
    )
  }

  if (!response.body) {
    throw new Error('OpenAI/Codex web search did not provide a streaming body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let remainder = ''
  let outputText = ''
  const sourceMap = new Map<string, { title: string; url: string }>()

  const appendSources = (value: unknown) => {
    for (const source of collectWebSearchSources(value)) {
      if (!sourceMap.has(source.url)) {
        sourceMap.set(source.url, source)
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    remainder += decoder.decode(value ?? new Uint8Array(), { stream: !done })

    while (true) {
      const frame = nextSseFrame(remainder)
      if (!frame) {
        break
      }
      remainder = frame.rest
      const payload = parseSsePayload(frame.frame)
      if (!payload) {
        continue
      }

      const event = JSON.parse(payload) as ChatgptSseEvent
      if (
        event.type === 'response.created' ||
        event.type === 'response.in_progress'
      ) {
        recordOpenAiCodexTelemetryFromEvent(event)
      }

      switch (event.type) {
        case 'response.output_text.delta':
          if (typeof event.delta === 'string') {
            outputText += event.delta
          }
          break
        case 'response.output_item.done':
          appendSources(event.item)
          break
        case 'response.completed':
          appendSources(event.response)
          break
        case 'response.failed': {
          const message =
            event.response &&
            typeof event.response === 'object' &&
            typeof (event.response as { error?: { message?: unknown } }).error
              ?.message === 'string'
              ? ((event.response as { error: { message: string } }).error.message)
              : 'OpenAI/Codex web search returned response.failed'
          throw new Error(message)
        }
        case 'response.incomplete':
          throw new Error('OpenAI/Codex web search returned an incomplete response')
        default:
          break
      }
    }

    if (done) {
      break
    }
  }

  outputText = outputText.trim()
  const sources = [...sourceMap.values()]

  if (!outputText && sources.length === 0) {
    throw new Error('OpenAI/Codex web search returned no content')
  }

  return {
    outputText,
    sources,
  }
}

export async function runOpenAiCodexFileSearch(params: {
  model: string
  query: string
  signal: AbortSignal
  options: Options
}): Promise<OpenAiCodexFileSearchResult> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    throw new Error(
      'OpenAI/Codex auth is not configured. Sign in through CT, set OPENAI_API_KEY, or link legacy Codex CLI auth, then retry with `SEATURTLE_USE_OPENAI_CODEX=1`.',
    )
  }

  const modelError = validateOpenAiCodexModel(params.model)
  if (modelError) {
    throw new Error(modelError)
  }

  const vectorStoreIds = getConfiguredOpenAiVectorStoreIds()
  if (vectorStoreIds.length === 0) {
    throw new Error(
      'OpenAI hosted file search is not configured. Set SEATURTLE_OPENAI_VECTOR_STORE_IDS to one or more vector store IDs and retry.',
    )
  }

  const requestTarget = buildOpenAiCodexRequestTarget(auth)
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)
  const input = buildSingleTurnOpenAiCodexInput(params.query)
  if (input.length === 0) {
    throw new Error('OpenAI/Codex file search request is missing query input')
  }

  const response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
    method: 'POST',
    headers: requestTarget.headers,
    body: JSON.stringify({
      model: params.model,
      instructions:
        'Use the file_search tool to answer the user query from the configured vector stores. Return a concise, source-backed result.',
      input,
      tools: [
        {
          type: 'file_search',
          vector_store_ids: vectorStoreIds,
        },
      ],
      tool_choice: 'auto',
      include: ['file_search_call.results'],
      ...(reasoning ? { reasoning } : {}),
      store: false,
    }),
    signal: params.signal,
  })

  recordOpenAiCodexTelemetryFromHeaders(response.headers)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      formatOpenAiCodexHttpError({
        status: response.status,
        statusText: response.statusText,
        body,
      }),
    )
  }

  const payload = await response.json()
  const outputText =
    payload &&
    typeof payload === 'object' &&
    typeof (payload as { output_text?: unknown }).output_text === 'string'
      ? (payload as { output_text: string }).output_text.trim()
      : ''
  const results = collectFileSearchResults(payload)

  if (!outputText && results.length === 0) {
    throw new Error('OpenAI/Codex file search returned no content')
  }

  return {
    outputText,
    results,
  }
}

export async function runOpenAiCodexImageGeneration(params: {
  model: string
  prompt: string
  signal: AbortSignal
  options: Options
}): Promise<OpenAiCodexImageGenerationResult> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    throw new Error(
      'OpenAI/Codex auth is not configured. Sign in through CT, set OPENAI_API_KEY, or link legacy Codex CLI auth, then retry with `SEATURTLE_USE_OPENAI_CODEX=1`.',
    )
  }

  const modelError = validateOpenAiCodexModel(params.model)
  if (modelError) {
    throw new Error(modelError)
  }

  const requestTarget = buildOpenAiCodexRequestTarget(auth)
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)
  const input = buildSingleTurnOpenAiCodexInput(params.prompt)
  if (input.length === 0) {
    throw new Error('OpenAI/Codex image generation request is missing prompt input')
  }

  const response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
    method: 'POST',
    headers: requestTarget.headers,
    body: JSON.stringify({
      model: params.model,
      instructions:
        'Use the image_generation tool to create a single image that best satisfies the user prompt.',
      input,
      tools: [{ type: 'image_generation' }],
      tool_choice: { type: 'image_generation' },
      ...(reasoning ? { reasoning } : {}),
      store: false,
    }),
    signal: params.signal,
  })

  recordOpenAiCodexTelemetryFromHeaders(response.headers)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      formatOpenAiCodexHttpError({
        status: response.status,
        statusText: response.statusText,
        body,
      }),
    )
  }

  const payload = await response.json()
  const imageResult = collectImageGenerationResult(payload)

  if (!imageResult) {
    throw new Error('OpenAI/Codex image generation returned no image output')
  }

  return imageResult
}

export async function runOpenAiCodexHostedShell(params: {
  model: string
  task: string
  allowedDomains?: string[]
  signal: AbortSignal
  options: Options
}): Promise<OpenAiCodexHostedShellResult> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    throw new Error(
      'OpenAI/Codex auth is not configured. Sign in through CT, set OPENAI_API_KEY, or link legacy Codex CLI auth, then retry with `SEATURTLE_USE_OPENAI_CODEX=1`.',
    )
  }

  const modelError = validateOpenAiCodexModel(params.model)
  if (modelError) {
    throw new Error(modelError)
  }

  const requestTarget = buildOpenAiCodexRequestTarget(auth)
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)
  const input = buildSingleTurnOpenAiCodexInput(params.task)
  if (input.length === 0) {
    throw new Error('OpenAI/Codex hosted shell request is missing task input')
  }
  const allowedDomains = (params.allowedDomains ?? [])
    .map(normalizeWebSearchDomain)
    .filter((domain): domain is string => !!domain)

  const response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
    method: 'POST',
    headers: requestTarget.headers,
    body: JSON.stringify({
      model: params.model,
      instructions:
        'Use the shell tool to complete the requested task in an isolated hosted environment. Keep the final answer concise and grounded in the shell output.',
      input,
      tools: [
        {
          type: 'shell',
          environment: {
            type: 'container_auto',
            ...(allowedDomains.length > 0
              ? {
                  network_policy: {
                    type: 'allowlist',
                    allowed_domains: allowedDomains,
                  },
                }
              : {}),
          },
        },
      ],
      tool_choice: 'required',
      ...(reasoning ? { reasoning } : {}),
      store: false,
    }),
    signal: params.signal,
  })

  recordOpenAiCodexTelemetryFromHeaders(response.headers)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      formatOpenAiCodexHttpError({
        status: response.status,
        statusText: response.statusText,
        body,
      }),
    )
  }

  const payload = await response.json()
  const outputText =
    payload &&
    typeof payload === 'object' &&
    typeof (payload as { output_text?: unknown }).output_text === 'string'
      ? (payload as { output_text: string }).output_text.trim()
      : ''
  const outputs = collectHostedShellOutputs(payload)

  if (!outputText && outputs.length === 0) {
    throw new Error('OpenAI/Codex hosted shell returned no shell output')
  }

  return {
    outputText,
    outputs,
  }
}

export async function runOpenAiCodexComputerUse(params: {
  model: string
  task: string
  apps: string[]
  signal: AbortSignal
  options: Options
  toolUseContext: ToolUseContext
  clipboardRead?: boolean
  clipboardWrite?: boolean
  systemKeyCombos?: boolean
  maxSteps?: number
}): Promise<OpenAiCodexComputerUseResult> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    throw new Error(
      'OpenAI/Codex auth is not configured. Sign in through CT, set OPENAI_API_KEY, or link legacy Codex CLI auth, then retry with `SEATURTLE_USE_OPENAI_CODEX=1`.',
    )
  }

  const modelError = validateOpenAiCodexModel(params.model)
  if (modelError) {
    throw new Error(modelError)
  }

  const requestTarget = buildOpenAiCodexRequestTarget(auth)
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)
  const initialInput = buildSingleTurnOpenAiCodexInput(params.task)
  if (initialInput.length === 0) {
    throw new Error('OpenAI computer use request is missing task input')
  }
  const requestedApps = params.apps
    .map(app => app.trim())
    .filter(app => app.length > 0)

  if (requestedApps.length === 0) {
    throw new Error(
      'OpenAI computer use requires at least one target app so SeaTurtle can request access explicitly.',
    )
  }

  const accessResult = await dispatchComputerUseMcpToolRaw(
    'request_access',
    {
      apps: requestedApps,
      reason: params.task.slice(0, 240),
      ...(params.clipboardRead ? { clipboardRead: true } : {}),
      ...(params.clipboardWrite ? { clipboardWrite: true } : {}),
      ...(params.systemKeyCombos ? { systemKeyCombos: true } : {}),
    },
    params.toolUseContext,
  )
  if (accessResult.isError) {
    const accessText = Array.isArray(accessResult.content)
      ? accessResult.content
          .flatMap(item =>
            item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string'
              ? [item.text]
              : [],
          )
          .join('\n')
          .trim()
      : ''
    throw new Error(
      accessText || 'OpenAI computer use could not acquire app access for this session.',
    )
  }

  const baseBody = {
    model: params.model,
    tools: [{ type: 'computer' as const }],
    ...(reasoning ? { reasoning } : {}),
    store: false,
  }

  let steps = 0
  let previousResponseId: string | null = null
  let outputText = ''
  let finalScreenshotBase64: string | null = null
  let finalScreenshotMediaType: string | null = null
  const maxSteps = Math.max(1, params.maxSteps ?? 25)

  try {
    let payload: unknown
    let response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
      method: 'POST',
      headers: requestTarget.headers,
      body: JSON.stringify({
        ...baseBody,
        instructions:
          'Use the computer tool for UI interaction. Execute the task directly, batch actions when appropriate, and stop as soon as the task is complete.',
        input: initialInput,
      }),
      signal: params.signal,
    })
    recordOpenAiCodexTelemetryFromHeaders(response.headers)
    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        formatOpenAiCodexHttpError({
          status: response.status,
          statusText: response.statusText,
          body,
        }),
      )
    }
    payload = await response.json()

    while (steps < maxSteps) {
      outputText = collectOutputText(payload)
      previousResponseId = collectResponseId(payload)
      const computerCall = collectComputerCall(payload)
      if (!computerCall) {
        return {
          outputText,
          steps,
          finalScreenshotBase64,
          finalScreenshotMediaType,
        }
      }

      if (!previousResponseId) {
        throw new Error('OpenAI computer use response is missing previous response state')
      }

      for (const action of computerCall.actions) {
        const result = await runComputerUseAction(action, params.toolUseContext)
        const screenshot = extractComputerScreenshot(result)
        if (screenshot) {
          finalScreenshotBase64 = screenshot.base64
          finalScreenshotMediaType = screenshot.mediaType
        }
      }

      if (!finalScreenshotBase64 || !finalScreenshotMediaType) {
        const screenshotResult = await dispatchComputerUseMcpToolRaw(
          'screenshot',
          {},
          params.toolUseContext,
        )
        if (screenshotResult.isError) {
          const screenshotText = Array.isArray(screenshotResult.content)
            ? screenshotResult.content
                .flatMap(item =>
                  item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string'
                    ? [item.text]
                    : [],
                )
                .join('\n')
                .trim()
            : ''
          throw new Error(
            screenshotText || 'OpenAI computer use failed to capture a follow-up screenshot.',
          )
        }
        const screenshot = extractComputerScreenshot(screenshotResult)
        if (!screenshot) {
          throw new Error('OpenAI computer use screenshot capture returned no image data')
        }
        finalScreenshotBase64 = screenshot.base64
        finalScreenshotMediaType = screenshot.mediaType
      }

      steps += 1
      response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
        method: 'POST',
        headers: requestTarget.headers,
        body: JSON.stringify({
          ...baseBody,
          previous_response_id: previousResponseId,
          input: [
            {
              type: 'computer_call_output',
              call_id: computerCall.callId,
              output: {
                type: 'computer_screenshot',
                image_url: `data:${finalScreenshotMediaType};base64,${finalScreenshotBase64}`,
                detail: 'original',
              },
            },
          ],
        }),
        signal: params.signal,
      })
      recordOpenAiCodexTelemetryFromHeaders(response.headers)
      if (!response.ok) {
        const body = await response.text()
        throw new Error(
          formatOpenAiCodexHttpError({
            status: response.status,
            statusText: response.statusText,
            body,
          }),
        )
      }
      payload = await response.json()
    }
  } finally {
    await cleanupComputerUseAfterTurn(params.toolUseContext).catch(() => {})
  }

  return {
    outputText,
    steps,
    finalScreenshotBase64,
    finalScreenshotMediaType,
  }
}

export async function* queryOpenAiCodexWithStreaming(params: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): AsyncGenerator<
  StreamEvent | AssistantMessage | SystemAPIErrorMessage,
  void
> {
  const auth = await getResolvedOpenAiCodexAuth()
  if (!auth) {
    yield createAssistantAPIErrorMessage({
      content:
        'OpenAI/Codex auth is not configured. Sign in through CT, set OPENAI_API_KEY, or link legacy Codex CLI auth, then retry with `SEATURTLE_USE_OPENAI_CODEX=1`.',
    })
    return
  }

  const modelError = validateOpenAiCodexModel(params.options.model)
  if (modelError) {
    yield createAssistantAPIErrorMessage({
      content: modelError,
    })
    return
  }

  const input = collectOpenAiCodexInputItems(params.messages)
  if (input.length === 0) {
    yield createAssistantAPIErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: OpenAI/Codex request is missing input messages`,
    })
    return
  }

  const tools = await buildOpenAiCodexTools({
    tools: params.tools,
  })
  const reasoning = buildOpenAiCodexReasoningPayload(params.options)
  const requestTarget = buildOpenAiCodexRequestTarget(auth)

  try {
    const response = await fetch(responsesEndpoint(requestTarget.baseUrl), {
      method: 'POST',
      headers: requestTarget.headers,
      body: JSON.stringify({
        model: params.options.model,
        instructions: buildInstructions(params.systemPrompt),
        input,
        tools,
        tool_choice: 'auto',
        parallel_tool_calls: false,
        ...(reasoning ? { reasoning } : {}),
        store: false,
        stream: true,
        include: ['reasoning.encrypted_content'],
      }),
      signal: params.signal,
    })

    recordOpenAiCodexTelemetryFromHeaders(response.headers)

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        formatOpenAiCodexHttpError({
          status: response.status,
          statusText: response.statusText,
          body,
        }),
      )
    }

    if (!response.body) {
      throw new Error('OpenAI/Codex backend did not provide a streaming body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let remainder = ''
    const startTime = Date.now()
    const envelope: SyntheticStreamEnvelope = {
      messageId: randomUUID(),
      emittedMessageStart: false,
      nextContentBlockIndex: 0,
      activeTextBlockIndex: null,
      activeText: '',
      completedBlocks: [],
      emittedAssistantMessages: [],
    }
    let stopReason: 'end_turn' | 'tool_use' = 'end_turn'
    const pendingToolUseByCallId = new Map<string, PendingSyntheticToolUse>()

    while (true) {
      const { done, value } = await reader.read()
      remainder += decoder.decode(value ?? new Uint8Array(), { stream: !done })

      while (true) {
        const frame = nextSseFrame(remainder)
        if (!frame) {
          break
        }
        remainder = frame.rest
        const payload = parseSsePayload(frame.frame)
        if (!payload) {
          continue
        }

        const event = JSON.parse(payload) as ChatgptSseEvent
        if (
          event.type === 'response.created' ||
          event.type === 'response.in_progress'
        ) {
          recordOpenAiCodexTelemetryFromEvent(event)
        }
        switch (event.type) {
          case 'response.output_item.added': {
            const item =
              event.item && typeof event.item === 'object'
                ? (event.item as {
                    type?: unknown
                    id?: unknown
                    call_id?: unknown
                    name?: unknown
                    arguments?: unknown
                  })
                : null
            if (item?.type === 'function_call') {
              const callId =
                typeof item.call_id === 'string'
                  ? item.call_id
                  : 'missing_tool_id'
              const pendingToolUse = pendingToolUseByCallId.get(callId) ?? {
                callId,
                itemId: null,
                name: 'unknown_tool',
                index: null,
                partialJson: '',
                finalArguments: null,
                finalized: false,
              }
              mergePendingSyntheticToolUseMetadata(pendingToolUse, item)
              pendingToolUseByCallId.set(callId, pendingToolUse)
              yield* flushBufferedSyntheticToolUseDelta(
                envelope,
                startTime,
                params.options.model,
                pendingToolUse,
              )
            }
            break
          }
          case 'response.output_text.delta':
            if (typeof event.delta === 'string' && event.delta.length > 0) {
              yield* ensureSyntheticTextBlockStart(
                envelope,
                startTime,
                params.options.model,
              )
              envelope.activeText += event.delta
              stopReason = 'end_turn'
              yield* emitSyntheticStreamEvent(
                {
                  type: 'content_block_delta',
                  index: envelope.activeTextBlockIndex ?? 0,
                  delta: {
                    type: 'text_delta',
                    text: event.delta,
                  },
                },
                envelope,
                startTime,
              )
            }
            break
          case 'response.function_call_arguments.delta': {
            const callId =
              typeof (event as { call_id?: unknown }).call_id === 'string'
                ? ((event as { call_id: string }).call_id as string)
                : 'missing_tool_id'
            const delta =
              typeof event.delta === 'string' ? event.delta : ''
            const pendingToolUse =
              pendingToolUseByCallId.get(callId) ?? {
                callId,
                itemId: null,
                name: 'unknown_tool',
                index: null,
                partialJson: '',
                finalArguments: null,
                finalized: false,
              }
            pendingToolUseByCallId.set(callId, pendingToolUse)
            stopReason = 'tool_use'
            yield* emitSyntheticToolUseDelta(
              envelope,
              startTime,
              params.options.model,
              pendingToolUse,
              delta,
            )
            break
          }
          case 'response.function_call_arguments.done': {
            const callId =
              typeof (event as { call_id?: unknown }).call_id === 'string'
                ? ((event as { call_id: string }).call_id as string)
                : 'missing_tool_id'
            const finalArguments =
              event &&
              typeof event === 'object' &&
              typeof (event as { arguments?: unknown }).arguments === 'string'
                ? ((event as { arguments: string }).arguments as string)
                : undefined
            const pendingToolUse =
              pendingToolUseByCallId.get(callId) ?? {
                callId,
                itemId: null,
                name: 'unknown_tool',
                index: null,
                partialJson: '',
                finalArguments: null,
                finalized: false,
              }
            pendingToolUseByCallId.set(callId, pendingToolUse)
            stopReason = 'tool_use'
            pendingToolUse.finalArguments =
              finalArguments ?? pendingToolUse.partialJson
            if (canRenderPendingSyntheticToolUse(pendingToolUse)) {
              yield* finalizeSyntheticToolUse(
                envelope,
                startTime,
                params.options.model,
                pendingToolUse,
                pendingToolUse.finalArguments,
              )
            }
            break
          }
          case 'response.output_item.done': {
            const itemType =
              event.item && typeof event.item === 'object'
                ? (event.item as { type?: unknown }).type
                : null
            if (itemType === 'function_call') {
              stopReason = 'tool_use'
              const item = (event.item ?? {}) as {
                call_id?: unknown
                name?: unknown
                arguments?: unknown
                id?: unknown
              }
              const callId =
                typeof item.call_id === 'string'
                  ? item.call_id
                  : 'missing_tool_id'
              const pendingToolUse = pendingToolUseByCallId.get(callId)
              if (pendingToolUse) {
                mergePendingSyntheticToolUseMetadata(pendingToolUse, item)
                yield* finalizeSyntheticToolUse(
                  envelope,
                  startTime,
                  params.options.model,
                  pendingToolUse,
                  pendingToolUse.finalArguments ??
                    (typeof item.arguments === 'string'
                      ? item.arguments
                      : undefined),
                )
              } else {
                yield* emitSyntheticToolUse(
                  envelope,
                  startTime,
                  params.options.model,
                  item,
                )
              }
            } else {
              const itemText = outputItemText(event.item)
              if (
                envelope.activeTextBlockIndex == null &&
                itemText.length > 0
              ) {
                yield* ensureSyntheticTextBlockStart(
                  envelope,
                  startTime,
                  params.options.model,
                )
                envelope.activeText += itemText
                yield* emitSyntheticStreamEvent(
                  {
                    type: 'content_block_delta',
                    index: envelope.activeTextBlockIndex ?? 0,
                    delta: {
                      type: 'text_delta',
                      text: itemText,
                    },
                  },
                  envelope,
                  startTime,
                )
              }
              yield* flushSyntheticTextBlock(envelope, startTime)
            }
            break
          }
          case 'response.failed': {
            const message =
              event.response &&
              typeof event.response === 'object' &&
              typeof (event.response as { error?: { message?: unknown } }).error
                ?.message === 'string'
                ? ((event.response as { error: { message: string } }).error.message)
                : 'OpenAI/Codex backend returned response.failed'
            throw new Error(message)
          }
          case 'response.incomplete':
            throw new Error('OpenAI/Codex backend returned an incomplete response')
          default:
            break
        }
      }

      if (done) {
        break
      }
    }

    yield* flushSyntheticTextBlock(envelope, startTime)

    if (envelope.completedBlocks.length === 0) {
      throw new Error('OpenAI/Codex backend returned no assistant content')
    }

    if (!envelope.emittedMessageStart) {
      yield* ensureSyntheticMessageStart(envelope, startTime, params.options.model)
    }

    yield* emitSyntheticStreamEvent(
      {
        type: 'message_delta',
        delta: {
          stop_reason: stopReason,
          stop_sequence: null,
        },
        usage: { ...ZERO_USAGE },
      },
      envelope,
      startTime,
    )

    for (const message of envelope.emittedAssistantMessages) {
      message.message.stop_reason = stopReason
      message.message.usage = { ...ZERO_USAGE }
    }

    yield* emitSyntheticStreamEvent(
      {
        type: 'message_stop',
      },
      envelope,
      startTime,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    yield createAssistantAPIErrorMessage({
      content: message.startsWith(API_ERROR_MESSAGE_PREFIX)
        ? message
        : `${API_ERROR_MESSAGE_PREFIX}: ${message}`,
    })
  }
}
