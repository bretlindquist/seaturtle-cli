#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { parseGeminiStreamSseEvents } from '../source/src/services/api/geminiStreamParser.js'

const first = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [{ text: 'hello ' }],
      },
    },
  ],
})
const second = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [
          {
            functionCall: {
              id: 'call_1',
              name: 'TodoWrite',
              args: { todos: [] },
            },
            thoughtSignature: 'sig-stream',
          },
        ],
      },
      finishReason: 'STOP',
    },
  ],
})

const partial = parseGeminiStreamSseEvents(
  `data: ${first}\n\n:data ignored\ndata: ${second}`,
)
assert.equal(partial.events.length, 1)
assert.equal(partial.events[0]?.candidates?.[0]?.content?.parts[0]?.text, 'hello ')
assert.match(partial.remainder, /sig-stream/)

const completed = parseGeminiStreamSseEvents(`${partial.remainder}\n\n`)
assert.equal(
  completed.events[0]?.candidates?.[0]?.content?.parts[0]?.functionCall?.name,
  'TodoWrite',
)
assert.equal(
  completed.events[0]?.candidates?.[0]?.content?.parts[0]?.thoughtSignature,
  'sig-stream',
)
assert.equal(completed.events[0]?.candidates?.[0]?.finishReason, 'STOP')

assert.throws(
  () => parseGeminiStreamSseEvents('data: {"candidates": [}\n\n'),
  SyntaxError,
)

console.log('gemini-streaming self-test passed')
