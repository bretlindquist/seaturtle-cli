import { z } from 'zod/v4'
import {
  runOpenAiCodexImageGeneration,
  type OpenAiCodexImageGenerationResult,
} from '../../services/api/openaiCodex.js'
import { getMainLoopProviderRuntime } from '../../services/api/providerRuntime.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { IMAGE_GENERATION_TOOL_NAME, getImageGenerationPrompt } from './prompt.js'
import {
  getToolUseSummary,
  renderToolResultMessage,
  renderToolUseMessage,
} from './UI.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    prompt: z
      .string()
      .min(8)
      .describe('A concrete prompt describing the image to generate'),
    referenceImages: z
      .array(
        z.object({
          mediaType: z.string(),
          imageBase64: z.string(),
        }),
      )
      .optional(),
    aspectRatio: z.string().optional(),
    imageSize: z.string().optional(),
    mode: z
      .enum(['generate', 'edit', 'inpaint', 'product', 'text_rendering'])
      .optional(),
    outputCount: z.number().int().positive().optional(),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    prompt: z.string(),
    revisedPrompt: z.string().nullable(),
    mediaType: z.string(),
    imageBase64: z.string(),
    durationSeconds: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

type GeminiReferenceImageInput = {
  mediaType: string
  imageBase64: string
}

export const ImageGenerationTool = buildTool({
  name: IMAGE_GENERATION_TOOL_NAME,
  searchHint: 'generate a new image from a prompt',
  maxResultSizeChars: 2_000_000,
  shouldDefer: true,
  async description(input) {
    return `Generate an image for: ${input.prompt}`
  },
  isEnabled() {
    const runtime = getMainLoopProviderRuntime()
    return (
      (runtime.family === 'openai' &&
        runtime.routedOpenAiModelCapabilities.includes('image generation')) ||
      (runtime.family === 'gemini' && runtime.supportsImageGeneration)
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
    return input.prompt
  },
  async prompt() {
    return getImageGenerationPrompt()
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
    const result: OpenAiCodexImageGenerationResult =
      runtime.family === 'gemini'
        ? await (async () => {
            const { runGeminiImageGeneration } = await import(
              '../../services/api/geminiImageGeneration.js'
            )
            return runGeminiImageGeneration({
              input: {
                prompt: input.prompt,
                referenceImages: input.referenceImages as
                  | GeminiReferenceImageInput[]
                  | undefined,
                aspectRatio: input.aspectRatio,
                imageSize: input.imageSize,
                mode: input.mode,
                outputCount: input.outputCount,
              },
              signal: context.abortController.signal,
            })
          })()
        : await runOpenAiCodexImageGeneration({
            model: context.options.mainLoopModel,
            prompt: input.prompt,
            signal: context.abortController.signal,
            options: {
              ...context.options,
              model: context.options.mainLoopModel,
            },
          })

    return {
      data: {
        prompt: input.prompt,
        revisedPrompt: result.revisedPrompt,
        mediaType: result.mediaType,
        imageBase64: result.imageBase64,
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
          type: 'image',
          source: {
            type: 'base64',
            media_type: content.mediaType,
            data: content.imageBase64,
          },
        },
        ...(content.revisedPrompt
          ? [
              {
                type: 'text' as const,
                text: `Revised prompt: ${content.revisedPrompt}`,
              },
            ]
          : []),
      ],
    }
  },
} satisfies ToolDef<InputSchema, Output>)
