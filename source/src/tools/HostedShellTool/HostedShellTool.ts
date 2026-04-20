import { z } from 'zod/v4'
import {
  runGeminiCodeExecution,
  type GeminiCodeExecutionResult,
} from '../../services/api/geminiCodeExecution.js'
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
    images: z
      .array(
        z.object({
          mediaType: z.string(),
          imageBase64: z.string(),
        }),
      )
      .optional(),
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
      (runtime.family === 'openai' && runtime.supportsHostedShell) ||
      (runtime.family === 'gemini' &&
        runtime.routedGeminiModelCapabilities.includes('code execution'))
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
    const runtime = getMainLoopProviderRuntime()
    const result: OpenAiCodexHostedShellResult | GeminiCodeExecutionResult =
      runtime.family === 'gemini'
        ? await runGeminiCodeExecution({
            model: context.options.mainLoopModel,
            task: input.task,
            signal: context.abortController.signal,
          })
        : await runOpenAiCodexHostedShell({
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
        summary:
          'outputText' in result
            ? result.outputText
            : result.summary,
        outputs: result.outputs,
        images: 'images' in result ? result.images : [],
        durationSeconds: (performance.now() - startTime) / 1000,
      },
    }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: [
        {
          type: 'text' as const,
          text: jsonStringify({
            ...content,
            images:
              content.images?.map(image => ({
                mediaType: image.mediaType,
                imageBase64Length: image.imageBase64.length,
              })) ?? [],
          }),
        },
        ...((content.images ?? []).map(image => ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: image.mediaType,
            data: image.imageBase64,
          },
        })) ?? []),
      ],
    }
  },
} satisfies ToolDef<InputSchema, Output>)
