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
  model: process.env.SEATURTLE_GEMINI_LIVE_TEXT_MODEL || 'gemini-2.5-flash',
  request: {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Reply with exactly: live text ok' }],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 32,
    },
  },
})

const text = response.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join(' ').trim().toLowerCase()
assert.match(text ?? '', /live text ok/)
console.log('gemini-live-text-check passed')
