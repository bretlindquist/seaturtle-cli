import { getGeminiApiKeyAuthTarget } from './gemini.js'
import { runGeminiGenerateContent } from './geminiClient.js'
import { extractGeminiText } from './geminiGrounding.js'
import type { GeminiGenerateContentRequest, GeminiPart } from './geminiTypes.js'

export type GeminiCodeExecutionImage = {
  mediaType: string
  imageBase64: string
}

export type GeminiCodeExecutionOutput = {
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
}

export type GeminiCodeExecutionResult = {
  summary: string
  outputs: GeminiCodeExecutionOutput[]
  images: GeminiCodeExecutionImage[]
}

function isTimedOutOutcome(outcome: string | undefined): boolean {
  const normalized = outcome?.trim().toLowerCase() ?? ''
  return normalized.includes('timeout') || normalized.includes('deadline')
}

export function buildGeminiCodeExecutionRequest(
  task: string,
): GeminiGenerateContentRequest {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: task }],
      },
    ],
    tools: [{ codeExecution: {} }],
  }
}

export function parseGeminiCodeExecutionResponse(parts: GeminiPart[]): GeminiCodeExecutionResult {
  const outputs = parts
    .filter(part => part.codeExecutionResult)
    .map(part => ({
      stdout: part.codeExecutionResult?.output ?? '',
      stderr: '',
      exitCode: null,
      timedOut: isTimedOutOutcome(part.codeExecutionResult?.outcome),
    }))

  const images = parts
    .filter(part => part.inlineData?.mimeType.startsWith('image/'))
    .map(part => ({
      mediaType: part.inlineData?.mimeType ?? 'image/png',
      imageBase64: part.inlineData?.data ?? '',
    }))
    .filter(image => image.imageBase64.length > 0)

  const summary = extractGeminiText(parts)

  if (!summary && outputs.length === 0 && images.length === 0) {
    throw new Error('Gemini code execution returned no output')
  }

  return {
    summary,
    outputs,
    images,
  }
}

export async function runGeminiCodeExecution(params: {
  model: string
  task: string
  signal: AbortSignal
}): Promise<GeminiCodeExecutionResult> {
  const auth = getGeminiApiKeyAuthTarget()
  if (!auth) {
    throw new Error('Gemini auth is not configured. Set GEMINI_API_KEY.')
  }

  const response = await runGeminiGenerateContent({
    auth,
    model: params.model,
    request: buildGeminiCodeExecutionRequest(params.task),
    signal: params.signal,
  })

  return parseGeminiCodeExecutionResponse(
    response.candidates?.[0]?.content?.parts ?? [],
  )
}
