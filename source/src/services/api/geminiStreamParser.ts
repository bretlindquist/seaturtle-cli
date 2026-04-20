import type { GeminiGenerateContentResponse } from './geminiTypes.js'

export function parseGeminiStreamSseEvents(buffer: string): {
  events: GeminiGenerateContentResponse[]
  remainder: string
} {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const chunks = normalized.split('\n\n')
  const remainder = chunks.pop() ?? ''
  const events: GeminiGenerateContentResponse[] = []

  for (const chunk of chunks) {
    const data = chunk
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice('data:'.length).trimStart())
      .join('\n')
      .trim()
    if (!data || data === '[DONE]') {
      continue
    }
    events.push(JSON.parse(data) as GeminiGenerateContentResponse)
  }

  return { events, remainder }
}
