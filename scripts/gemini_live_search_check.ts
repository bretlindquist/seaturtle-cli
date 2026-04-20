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
  model: process.env.SEATURTLE_GEMINI_LIVE_SEARCH_MODEL || 'gemini-2.5-flash',
  request: {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: 'Find the official Gemini API documentation homepage and summarize it in one sentence.',
          },
        ],
      },
    ],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 128,
    },
  },
})

const text = response.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join(' ').trim()
const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
assert.ok(text.length > 0)
assert.ok(sources.length > 0)
console.log('gemini-live-search-check passed')
