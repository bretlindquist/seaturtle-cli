import { z } from 'zod/v4'
import {
  runGeminiFileSearch,
  type GeminiFileSearchResult,
} from '../../services/api/geminiFileSearch.js'
import {
  runOpenAiCodexFileSearch,
  type OpenAiCodexFileSearchResult,
} from '../../services/api/openaiCodex.js'
import { getMainLoopProviderRuntime } from '../../services/api/providerRuntime.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { FILE_SEARCH_TOOL_NAME, getFileSearchPrompt } from './prompt.js'
import {
  getToolUseSummary,
  renderToolResultMessage,
  renderToolUseMessage,
  renderToolUseProgressMessage,
} from './UI.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    query: z.string().min(2).describe('The semantic file-search query to run'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const fileResultSchema = z.object({
  fileId: z.string().nullable(),
  filename: z.string().nullable(),
  score: z.number().nullable(),
  snippet: z.string().nullable(),
})

const outputSchema = lazySchema(() =>
  z.object({
    query: z.string(),
    summary: z.string(),
    results: z.array(fileResultSchema),
    durationSeconds: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const FileSearchTool = buildTool({
  name: FILE_SEARCH_TOOL_NAME,
  searchHint: 'search configured indexed files',
  maxResultSizeChars: 100_000,
  shouldDefer: true,
  async description(input) {
    return `Search configured files for: ${input.query}`
  },
  isEnabled() {
    const runtime = getMainLoopProviderRuntime()
    return (
      (runtime.family === 'openai' && runtime.supportsHostedFileSearch) ||
      (runtime.family === 'gemini' && runtime.supportsHostedFileSearch)
    )
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return input.query
  },
  async prompt() {
    return getFileSearchPrompt()
  },
  renderToolUseMessage,
  renderToolUseProgressMessage,
  renderToolResultMessage,
  getToolUseSummary,
  extractSearchText() {
    return ''
  },
  async call(input, context) {
    const startTime = performance.now()
    const runtime = getMainLoopProviderRuntime()
    const result: OpenAiCodexFileSearchResult | GeminiFileSearchResult =
      runtime.family === 'gemini'
        ? await runGeminiFileSearch({
            model: context.options.mainLoopModel,
            query: input.query,
            signal: context.abortController.signal,
          })
        : await runOpenAiCodexFileSearch({
            model: context.options.mainLoopModel,
            query: input.query,
            signal: context.abortController.signal,
            options: {
              ...context.options,
              model: context.options.mainLoopModel,
            },
          })

    return {
      data: {
        query: input.query,
        summary: result.outputText,
        results: result.results,
        durationSeconds: (performance.now() - startTime) / 1000,
      },
    }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: jsonStringify(content),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
