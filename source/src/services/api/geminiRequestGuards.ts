import { roughTokenCountEstimation } from '../tokenEstimation.js'
import {
  getGeminiModelDefinition,
} from './geminiCapabilityConfig.js'
import type {
  GeminiContent,
  GeminiGenerateContentRequest,
  GeminiPart,
} from './geminiTypes.js'

export const GEMINI_MAX_INLINE_REQUEST_BYTES = 20 * 1024 * 1024

function estimateGeminiPartTokens(part: GeminiPart): number {
  let total = 0
  if (typeof part.text === 'string') {
    total += roughTokenCountEstimation(part.text)
  }
  if (part.functionCall) {
    total += roughTokenCountEstimation(
      JSON.stringify({
        name: part.functionCall.name,
        args: part.functionCall.args ?? {},
      }),
    )
  }
  if (part.functionResponse) {
    total += roughTokenCountEstimation(
      JSON.stringify({
        name: part.functionResponse.name,
        response: part.functionResponse.response,
      }),
    )
  }
  if (part.executableCode?.code) {
    total += roughTokenCountEstimation(part.executableCode.code)
  }
  if (part.codeExecutionResult?.output) {
    total += roughTokenCountEstimation(part.codeExecutionResult.output)
  }
  return total
}

function estimateGeminiContentsTokens(contents: GeminiContent[] = []): number {
  return contents.reduce(
    (total, content) =>
      total +
      content.parts.reduce(
        (partTotal, part) => partTotal + estimateGeminiPartTokens(part),
        0,
      ),
    0,
  )
}

export function validateGeminiRequestAgainstModelLimits(params: {
  model: string
  request: GeminiGenerateContentRequest
}): string | null {
  const modelDefinition = getGeminiModelDefinition(params.model)
  if (!modelDefinition) {
    return null
  }

  const requestBytes = Buffer.byteLength(JSON.stringify(params.request), 'utf8')
  if (requestBytes > GEMINI_MAX_INLINE_REQUEST_BYTES) {
    return `Gemini inline request is too large for this build (${requestBytes.toLocaleString()} bytes > ${GEMINI_MAX_INLINE_REQUEST_BYTES.toLocaleString()} bytes). Upload large media through the Files API path instead of sending it inline.`
  }

  const requestedOutputTokens =
    params.request.generationConfig?.maxOutputTokens ??
    Math.min(8_192, modelDefinition.outputTokenLimit ?? 8_192)

  if (
    typeof modelDefinition.outputTokenLimit === 'number' &&
    requestedOutputTokens > modelDefinition.outputTokenLimit
  ) {
    return `Gemini max output tokens ${requestedOutputTokens.toLocaleString()} exceed the documented limit for ${params.model} (${modelDefinition.outputTokenLimit.toLocaleString()}).`
  }

  if (
    params.request.cachedContent ||
    typeof modelDefinition.contextWindowTokens !== 'number'
  ) {
    return null
  }

  const estimatedInputTokens =
    estimateGeminiContentsTokens(params.request.contents) +
    estimateGeminiContentsTokens(
      params.request.systemInstruction ? [params.request.systemInstruction] : [],
    ) +
    roughTokenCountEstimation(JSON.stringify(params.request.tools ?? []))

  if (
    estimatedInputTokens + requestedOutputTokens >
    modelDefinition.contextWindowTokens
  ) {
    return `Gemini request is estimated to exceed the ${params.model} context window (${estimatedInputTokens.toLocaleString()} input + ${requestedOutputTokens.toLocaleString()} output > ${modelDefinition.contextWindowTokens.toLocaleString()}). Reduce prompt size, reduce max output tokens, or move large inputs to Files API / cached content.`
  }

  return null
}
