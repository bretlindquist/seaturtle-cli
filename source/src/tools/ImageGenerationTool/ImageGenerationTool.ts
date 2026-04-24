import { z } from 'zod/v4'
import {
  runOpenAiCodexImageGeneration,
  type OpenAiCodexImageReferenceInput,
  type OpenAiCodexImageGenerationResult,
} from '../../services/api/openaiCodex.js'
import { getMainLoopProviderRuntime } from '../../services/api/providerRuntime.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import type { PastedContent } from '../../utils/config.js'
import { reserveImagePasteIds, storeImage } from '../../utils/imageStore.js'
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
    savedImageId: z.number().int().positive().nullable(),
    savedImagePath: z.string().nullable(),
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
            // Gemini image generation is provider-hosted and uses the
            // provider's dedicated image-model routing, not the main-loop
            // chat model selected for the session.
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
            input: {
              prompt: input.prompt,
              referenceImages:
                input.referenceImages as OpenAiCodexImageReferenceInput[] | undefined,
              aspectRatio: input.aspectRatio,
              imageSize: input.imageSize,
              mode: input.mode,
              outputCount: input.outputCount,
            },
            signal: context.abortController.signal,
            options: {
              ...context.options,
              model: context.options.mainLoopModel,
            },
          })

    const [savedImageId] = reserveImagePasteIds(context.messages, 1)
    const storedImage: PastedContent = {
      id: savedImageId,
      type: 'image',
      content: result.imageBase64,
      mediaType: result.mediaType,
      filename: 'Generated image',
    }
    const savedImagePath = await storeImage(storedImage)

    return {
      data: {
        prompt: input.prompt,
        revisedPrompt: result.revisedPrompt,
        mediaType: result.mediaType,
        imageBase64: result.imageBase64,
        savedImageId: savedImagePath ? savedImageId : null,
        savedImagePath,
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
        ...(content.savedImagePath
          ? [
              {
                type: 'text' as const,
                text:
                  content.savedImageId !== null
                    ? `Saved local copy as [Image #${content.savedImageId}] at ${content.savedImagePath}`
                    : `Saved local copy at ${content.savedImagePath}`,
              },
            ]
          : []),
      ],
    }
  },
} satisfies ToolDef<InputSchema, Output>)
