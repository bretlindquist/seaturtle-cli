#!/usr/bin/env bun

import assert from 'node:assert/strict'
import {
  collectGeminiContents,
  parseGeminiAssistantContent,
} from '../source/src/services/api/geminiContent.js'

const toolCallResponse = {
  candidates: [
    {
      content: {
        role: 'model' as const,
        parts: [
          {
            functionCall: {
              id: 'call_123',
              name: 'TodoWrite',
              args: {
                todos: [{ content: 'ship gemini', status: 'pending' }],
              },
            },
            thoughtSignature: 'hidden-thought-signature',
          },
        ],
      },
    },
  ],
}

const [toolUseBlock] = parseGeminiAssistantContent(toolCallResponse)
assert.equal(toolUseBlock?.type, 'tool_use')
assert.deepEqual((toolUseBlock as { input?: unknown }).input, {
  todos: [{ content: 'ship gemini', status: 'pending' }],
})
assert.equal(
  (toolUseBlock as {
    providerMetadata?: { gemini?: { thoughtSignature?: string } }
  }).providerMetadata?.gemini?.thoughtSignature,
  'hidden-thought-signature',
)

const assistantMessage = {
  type: 'assistant',
  message: {
    content: [toolUseBlock],
  },
}
const toolResultMessage = {
  type: 'user',
  message: {
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'call_123',
        content: [{ type: 'text', text: 'todo saved' }],
      },
    ],
  },
}

const replay = collectGeminiContents({
  messages: [assistantMessage, toolResultMessage] as never,
})
assert.equal(replay.validationError, undefined)
assert.equal(
  replay.contents[0]?.parts[0]?.functionCall?.name,
  'TodoWrite',
)
assert.equal(
  replay.contents[0]?.parts[0]?.thoughtSignature,
  'hidden-thought-signature',
)
assert.equal(
  replay.contents[1]?.parts[0]?.functionResponse?.name,
  'TodoWrite',
)
assert.equal(
  replay.contents[1]?.parts[0]?.functionResponse?.response.content,
  'todo saved',
)

const missingSignature = collectGeminiContents({
  messages: [
    {
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'call_missing_sig',
            name: 'TodoWrite',
            input: {},
            providerMetadata: {
              gemini: {
                functionName: 'TodoWrite',
                requiresThoughtSignature: true,
              },
            },
          },
        ],
      },
    },
  ] as never,
})
assert.match(
  missingSignature.validationError ?? '',
  /missing its thought signature/,
)

const imageMessage = {
  type: 'user',
  message: {
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'aW1hZ2U=',
        },
      },
      { type: 'text', text: 'describe this image' },
    ],
  },
}
const imageConversion = collectGeminiContents({
  messages: [imageMessage] as never,
})
assert.equal(
  imageConversion.contents[0]?.parts[0]?.inlineData?.mimeType,
  'image/png',
)
assert.equal(
  imageConversion.contents[0]?.parts[1]?.text,
  'describe this image',
)

const imageResponse = parseGeminiAssistantContent({
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'cmVzdWx0',
            },
          },
        ],
      },
    },
  ],
})
assert.equal(imageResponse[0]?.type, 'image')
assert.equal(
  (imageResponse[0] as { source?: { media_type?: string } }).source?.media_type,
  'image/png',
)

console.log('gemini-content self-test passed')
