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
  model:
    process.env.SEATURTLE_GEMINI_LIVE_IMAGE_MODEL ||
    process.env.SEATURTLE_GEMINI_IMAGE_MODEL ||
    'gemini-2.5-flash-image',
  request: {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: 'Generate a small flat-color icon of a sea turtle on a plain background.',
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '1:1',
      },
      maxOutputTokens: 256,
    },
  },
})

const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData
assert.ok((imagePart?.data ?? '').length > 100)
assert.match(imagePart?.mimeType ?? '', /^image\//)
console.log('gemini-live-image-check passed')
