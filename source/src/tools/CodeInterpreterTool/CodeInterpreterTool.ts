import { z } from 'zod/v4'
import {
  runOpenAiCodexCodeInterpreter,
  type OpenAiCodexCodeInterpreterResult,
} from '../../services/api/openaiCodex.js'
import { getMainLoopProviderRuntime } from '../../services/api/providerRuntime.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import {
  CODE_INTERPRETER_TOOL_NAME,
  getCodeInterpreterPrompt,
} from './prompt.js'
import {
  getToolUseSummary,
  renderToolResultMessage,
  renderToolUseMessage,
} from './UI.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    task: z
      .string()
      .min(8)
      .describe('The Python/data-analysis task to run in OpenAI hosted code interpreter'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const generatedFileSchema = z.object({
  containerId: z.string().nullable(),
  fileId: z.string(),
  filename: z.string().nullable(),
})

const outputSchema = lazySchema(() =>
  z.object({
    task: z.string(),
    summary: z.string(),
    containerId: z.string().nullable(),
    files: z.array(generatedFileSchema),
    durationSeconds: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const CodeInterpreterTool = buildTool({
  name: CODE_INTERPRETER_TOOL_NAME,
  searchHint: 'run Python in the hosted OpenAI code interpreter sandbox',
  maxResultSizeChars: 100_000,
  shouldDefer: true,
  async description(input) {
    return `Run in hosted Python: ${input.task}`
  },
  isEnabled() {
    const runtime = getMainLoopProviderRuntime()
    return (
      runtime.family === 'openai' &&
      runtime.routedOpenAiModelCapabilities.includes('code interpreter')
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
    return input.task
  },
  async prompt() {
    return getCodeInterpreterPrompt()
  },
  renderToolUseMessage,
  renderToolResultMessage,
  getToolUseSummary,
  extractSearchText() {
    return ''
  },
  async call(input, context) {
    const startTime = performance.now()
    const result: OpenAiCodexCodeInterpreterResult =
      await runOpenAiCodexCodeInterpreter({
        model: context.options.mainLoopModel,
        task: input.task,
        signal: context.abortController.signal,
        options: {
          ...context.options,
          model: context.options.mainLoopModel,
        },
      })

    return {
      data: {
        task: input.task,
        summary: result.outputText,
        containerId: result.containerId,
        files: result.files,
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
