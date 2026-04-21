import { runGeminiGenerateContent } from './geminiClient.js'
import type { GeminiGenerateContentRequest, GeminiPart } from './geminiTypes.js'
import { getResolvedGeminiApiKeyAuth } from '../authProfiles/geminiAuth.js'

export type GeminiReferenceImage = {
  mediaType: string
  imageBase64: string
}

export type GeminiImageGenerationInput = {
  model?: string
  prompt: string
  referenceImages?: GeminiReferenceImage[]
  aspectRatio?: string
  imageSize?: string
  mode?: 'generate' | 'edit' | 'inpaint' | 'product' | 'text_rendering'
  outputCount?: number
}

export type GeminiImageGenerationResult = {
  prompt: string
  revisedPrompt: string | null
  mediaType: string
  imageBase64: string
}

const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image'
const GEMINI_IMAGE_MODELS = new Set([
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
])
const SUPPORTED_ASPECT_RATIOS = new Set([
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
  '21:9',
])
const SUPPORTED_IMAGE_SIZES = new Set(['1K', '2K', '4K'])
const MAX_REFERENCE_IMAGES = 14

function getGeminiImageAuthTarget(): {
  baseUrl: string
  apiKey: string
  source: string
} | null {
  const auth = getResolvedGeminiApiKeyAuth()
  return auth
    ? {
        apiKey: auth.apiKey,
        baseUrl: auth.baseUrl,
        source: auth.source,
      }
    : null
}

function getGeminiImageModel(explicitModel?: string): string {
  return (
    explicitModel?.trim() ||
    process.env.SEATURTLE_GEMINI_IMAGE_MODEL?.trim() ||
    process.env.GEMINI_IMAGE_MODEL?.trim() ||
    DEFAULT_GEMINI_IMAGE_MODEL
  )
}

function validateGeminiImageInput(input: GeminiImageGenerationInput): string | null {
  const model = getGeminiImageModel(input.model)
  if (!GEMINI_IMAGE_MODELS.has(model)) {
    return `Gemini image generation model \`${model}\` is not routed. Set SEATURTLE_GEMINI_IMAGE_MODEL to one of: ${Array.from(GEMINI_IMAGE_MODELS).join(', ')}.`
  }
  if (input.aspectRatio && !SUPPORTED_ASPECT_RATIOS.has(input.aspectRatio)) {
    return `Gemini image aspectRatio \`${input.aspectRatio}\` is unsupported. Supported values: ${Array.from(SUPPORTED_ASPECT_RATIOS).join(', ')}.`
  }
  if (input.imageSize && !SUPPORTED_IMAGE_SIZES.has(input.imageSize)) {
    return `Gemini imageSize \`${input.imageSize}\` is unsupported. Supported values: ${Array.from(SUPPORTED_IMAGE_SIZES).join(', ')}.`
  }
  if (input.imageSize && !model.startsWith('gemini-3')) {
    return 'Gemini imageSize is only routed for Gemini 3 image models.'
  }
  if ((input.referenceImages?.length ?? 0) > MAX_REFERENCE_IMAGES) {
    return `Gemini image editing supports at most ${MAX_REFERENCE_IMAGES} reference images.`
  }
  if (input.outputCount !== undefined && input.outputCount !== 1) {
    return 'Gemini image generation currently routes one output image per tool call.'
  }
  return null
}

function buildGeminiImageParts(input: GeminiImageGenerationInput): GeminiPart[] {
  return [
    { text: input.prompt },
    ...(input.referenceImages ?? []).map(image => ({
      inlineData: {
        mimeType: image.mediaType,
        data: image.imageBase64,
      },
    })),
  ]
}

export function buildGeminiImageGenerationRequest(
  input: GeminiImageGenerationInput,
): GeminiGenerateContentRequest {
  const imageConfig: Record<string, unknown> = {
    ...(input.aspectRatio ? { aspectRatio: input.aspectRatio } : {}),
    ...(input.imageSize ? { imageSize: input.imageSize } : {}),
  }
  return {
    contents: [
      {
        role: 'user',
        parts: buildGeminiImageParts(input),
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {}),
    },
  }
}

export function parseGeminiImageGenerationResponse(params: {
  prompt: string
  responseParts: GeminiPart[]
}): GeminiImageGenerationResult {
  const imagePart = params.responseParts.find(part => part.inlineData)
  if (!imagePart?.inlineData) {
    throw new Error('Gemini image generation returned no image output')
  }
  const text = params.responseParts
    .map(part => part.text)
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n\n')
  return {
    prompt: params.prompt,
    revisedPrompt: text || null,
    mediaType: imagePart.inlineData.mimeType,
    imageBase64: imagePart.inlineData.data,
  }
}

export async function runGeminiImageGeneration(params: {
  input: GeminiImageGenerationInput
  signal: AbortSignal
}): Promise<GeminiImageGenerationResult> {
  const auth = getGeminiImageAuthTarget()
  if (!auth) {
    throw new Error(
      'Gemini auth is not configured. Use /login to link Gemini in CT, or set GEMINI_API_KEY.',
    )
  }
  const validationError = validateGeminiImageInput(params.input)
  if (validationError) {
    throw new Error(validationError)
  }
  const model = getGeminiImageModel(params.input.model)
  const response = await runGeminiGenerateContent({
    auth,
    model,
    request: buildGeminiImageGenerationRequest(params.input),
    signal: params.signal,
  })
  return parseGeminiImageGenerationResponse({
    prompt: params.input.prompt,
    responseParts: response.candidates?.[0]?.content?.parts ?? [],
  })
}
