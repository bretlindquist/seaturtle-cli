export type GeminiRole = 'user' | 'model'

export type GeminiInlineData = {
  mimeType: string
  data: string
}

export type GeminiFunctionCall = {
  id?: string
  name: string
  args?: Record<string, unknown>
}

export type GeminiFunctionResponse = {
  id?: string
  name: string
  response: Record<string, unknown>
}

export type GeminiPart = {
  text?: string
  inlineData?: GeminiInlineData
  functionCall?: GeminiFunctionCall
  functionResponse?: GeminiFunctionResponse
  executableCode?: {
    language?: string
    code?: string
  }
  codeExecutionResult?: {
    outcome?: string
    output?: string
  }
  thoughtSignature?: string
}

export type GeminiContent = {
  role?: GeminiRole
  parts: GeminiPart[]
}

export type GeminiFunctionDeclaration = {
  name: string
  description?: string
  parameters?: unknown
}

export type GeminiTool = {
  functionDeclarations?: GeminiFunctionDeclaration[]
  googleSearch?: Record<string, never>
  urlContext?: Record<string, never>
  codeExecution?: Record<string, never>
  fileSearch?: unknown
  computerUse?: unknown
}

export type GeminiToolConfig = Record<string, unknown>

export type GeminiGenerationConfig = {
  maxOutputTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  responseModalities?: string[]
  responseMimeType?: string
  responseSchema?: unknown
  thinkingConfig?: Record<string, unknown>
  imageConfig?: Record<string, unknown>
}

export type GeminiSafetySetting = Record<string, unknown>

export type GeminiGenerateContentRequest = {
  contents: GeminiContent[]
  systemInstruction?: GeminiContent
  tools?: GeminiTool[]
  toolConfig?: GeminiToolConfig
  generationConfig?: GeminiGenerationConfig
  safetySettings?: GeminiSafetySetting[]
  cachedContent?: string
  serviceTier?: string
}

export type GeminiGroundingMetadata = {
  groundingChunks?: Array<{
    web?: {
      uri?: string
      title?: string
    }
    retrievedContext?: {
      text?: string
      title?: string
      uri?: string
      customMetadata?: unknown[]
    }
    retrieved_context?: {
      text?: string
      title?: string
      uri?: string
      custom_metadata?: unknown[]
    }
  }>
  groundingSupports?: Array<{
    groundingChunkIndices?: number[]
  }>
  webSearchQueries?: string[]
  searchEntryPoint?: Record<string, unknown>
  retrievalMetadata?: Record<string, unknown>
}

export type GeminiUrlContextMetadata = {
  urlMetadata?: Array<{
    retrievedUrl?: string
    urlRetrievalStatus?: string
  }>
  url_metadata?: Array<{
    retrieved_url?: string
    url_retrieval_status?: string
  }>
}

export type GeminiCandidate = {
  content?: GeminiContent
  finishReason?: string
  groundingMetadata?: GeminiGroundingMetadata
  urlContextMetadata?: GeminiUrlContextMetadata
  url_context_metadata?: GeminiUrlContextMetadata
}

export type GeminiUsageMetadata = Record<string, unknown>

export type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[]
  usageMetadata?: GeminiUsageMetadata
  promptFeedback?: Record<string, unknown>
  error?: {
    code?: number
    status?: string
    message?: string
  }
}
