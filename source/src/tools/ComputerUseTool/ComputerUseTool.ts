import { z } from 'zod/v4'
import {
  runGeminiComputerUse,
  type GeminiComputerUseResult,
} from '../../services/api/geminiComputerUse.js'
import {
  runOpenAiCodexComputerUse,
  type OpenAiCodexComputerUseResult,
} from '../../services/api/openaiCodex.js'
import { getMainLoopProviderRuntime } from '../../services/api/providerRuntime.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { COMPUTER_USE_TOOL_NAME, getComputerUsePrompt } from './prompt.js'
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
      .describe('The GUI task to complete on the user desktop'),
    apps: z
      .array(z.string().min(1))
      .min(1)
      .describe('The concrete target apps to request access for before interaction begins'),
    clipboardRead: z
      .boolean()
      .optional()
      .describe('Request clipboard read access if the task needs to inspect clipboard contents'),
    clipboardWrite: z
      .boolean()
      .optional()
      .describe('Request clipboard write access if the task needs fast paste support'),
    systemKeyCombos: z
      .boolean()
      .optional()
      .describe('Request system-level shortcut access only if the task needs OS-level key chords'),
    maxSteps: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of provider-routed computer-use loop iterations before stopping'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    task: z.string(),
    apps: z.array(z.string()),
    summary: z.string(),
    steps: z.number().int().nonnegative(),
    finalScreenshotBase64: z.string().nullable(),
    finalScreenshotMediaType: z.string().nullable(),
    durationSeconds: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const ComputerUseTool = buildTool({
  name: COMPUTER_USE_TOOL_NAME,
  searchHint: 'use provider-routed computer use against the local desktop',
  maxResultSizeChars: 2_000_000,
  shouldDefer: true,
  async description(input) {
    return `Use the desktop for: ${input.task}`
  },
  isEnabled() {
    const runtime = getMainLoopProviderRuntime()
    return runtime.supportsComputerUse
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
    return false
  },
  toAutoClassifierInput(input) {
    return input.task
  },
  async prompt() {
    return getComputerUsePrompt()
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
    const result: OpenAiCodexComputerUseResult | GeminiComputerUseResult =
      runtime.family === 'gemini'
        ? await runGeminiComputerUse({
            task: input.task,
            apps: input.apps,
            clipboardRead: input.clipboardRead,
            clipboardWrite: input.clipboardWrite,
            systemKeyCombos: input.systemKeyCombos,
            maxSteps: input.maxSteps,
            signal: context.abortController.signal,
            toolUseContext: context,
          })
        : await runOpenAiCodexComputerUse({
            model: context.options.mainLoopModel,
            task: input.task,
            apps: input.apps,
            clipboardRead: input.clipboardRead,
            clipboardWrite: input.clipboardWrite,
            systemKeyCombos: input.systemKeyCombos,
            maxSteps: input.maxSteps,
            signal: context.abortController.signal,
            options: {
              ...context.options,
              model: context.options.mainLoopModel,
            },
            toolUseContext: context,
          })

    return {
      data: {
        task: input.task,
        apps: input.apps,
        summary: result.outputText,
        steps: result.steps,
        finalScreenshotBase64: result.finalScreenshotBase64,
        finalScreenshotMediaType: result.finalScreenshotMediaType,
        durationSeconds: (performance.now() - startTime) / 1000,
      },
    }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: [
        ...(content.finalScreenshotBase64 && content.finalScreenshotMediaType
          ? [
              {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: content.finalScreenshotMediaType,
                  data: content.finalScreenshotBase64,
                },
              },
            ]
          : []),
        {
          type: 'text' as const,
          text: jsonStringify({
            task: content.task,
            apps: content.apps,
            summary: content.summary,
            steps: content.steps,
            durationSeconds: content.durationSeconds,
          }),
        },
      ],
    }
  },
} satisfies ToolDef<InputSchema, Output>)
