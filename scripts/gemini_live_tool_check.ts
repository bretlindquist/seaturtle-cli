#!/usr/bin/env bun

import assert from 'node:assert/strict'
import {
  getGeminiLiveAuthOrSkip,
  runGeminiLiveRequest,
} from './gemini_live_helpers.js'

const auth = getGeminiLiveAuthOrSkip()
if (!auth) {
  process.exit(0)
}

const response = await runGeminiLiveRequest({
  auth,
  model: process.env.SEATURTLE_GEMINI_LIVE_TOOL_MODEL || 'gemini-2.5-flash',
  request: {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Call the ping tool once with {"message":"live tool ok"} and do not answer with plain text.' }],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: 'ping',
            description: 'Echo readiness for the Gemini function-calling live check.',
            parameters: {
              type: 'OBJECT',
              properties: {
                message: { type: 'STRING' },
              },
              required: ['message'],
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 128,
    },
  },
})

const functionCall = response.candidates?.[0]?.content?.parts?.find((part: any) => part.functionCall)?.functionCall
assert.equal(functionCall?.name, 'ping')
assert.equal(functionCall?.args?.message, 'live tool ok')
console.log('gemini-live-tool-check passed')
