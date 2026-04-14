import { z } from 'zod/v4'
import {
  runOpenAiCodexHostedShell,
  type OpenAiCodexHostedShellResult,
} from '../../services/api/openaiCodex.js'
import { getMainLoopProviderRuntime } from '../../services/api/providerRuntime.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { getHostedShellPrompt, HOSTED_SHELL_TOOL_NAME } from './prompt.js'
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
      .describe('The task to execute in the hosted shell environment'),
    allowed_domains: z
      .array(z.string())
      .optional()
      .describe('Optional domain allowlist for outbound network access'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const shellOutputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().nullable(),
  timedOut: z.boolean(),
})

const outputSchema = lazySchema(() =>
  z.object({
    task: z.string(),
    summary: z.string(),
    outputs: z.array(shellOutputSchema),
    durationSeconds: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const HostedShellTool = buildTool({
  name: HOSTED_SHELL_TOOL_NAME,
  searchHint: 'run a task in an isolated hosted shell container',
  maxResultSizeChars: 100_000,
  shouldDefer: true,
  async description(input) {
    return `Run in hosted shell: ${input.task}`
  },
  isEnabled() {
    const runtime = getMainLoopProviderRuntime()
    return (
      runtime.family === 'openai' &&
      runtime.supportsHostedShell
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
    return getHostedShellPrompt()
  },
  renderToolUseMessage,
  renderToolResultMessage,
  getToolUseSummary,
  extractSearchText() {
    return ''
  },
  async call(input, context) {
    const startTime = performance.now()
    const result: OpenAiCodexHostedShellResult =
      await runOpenAiCodexHostedShell({
        model: context.options.mainLoopModel,
        task: input.task,
        allowedDomains: input.allowed_domains,
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
        outputs: result.outputs,
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
