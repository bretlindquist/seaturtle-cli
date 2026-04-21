#!/usr/bin/env bun

import assert from 'node:assert/strict'
import {
  buildGeminiFunctionDeclaration,
  normalizeGeminiToolParameterSchema,
  validateGeminiFunctionName,
} from '../source/src/services/api/geminiToolSchema.js'
import { collectGeminiContents } from '../source/src/services/api/geminiContent.js'

const todoSchema = normalizeGeminiToolParameterSchema({
  type: 'object',
  strict: true,
  additionalProperties: false,
  properties: {
    todos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          content: { type: 'string' },
          status: {
            anyOf: [
              { const: 'pending' },
              { const: 'in_progress' },
              { const: 'completed' },
            ],
          },
        },
        required: ['content', 'status'],
      },
    },
  },
  required: ['todos'],
})
assert.equal(todoSchema.type, 'object')
assert.equal('strict' in todoSchema, false)
assert.equal('additionalProperties' in todoSchema, false)
assert.deepEqual(
  (((todoSchema.properties as never).todos as never).items as never).properties
    .status.enum,
  ['pending', 'in_progress', 'completed'],
)

const bashDeclaration = buildGeminiFunctionDeclaration({
  name: 'Bash',
  description: 'Runs a shell command.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string' },
      timeout: { type: ['integer', 'null'] },
    },
    required: ['command'],
  },
})
assert.equal(bashDeclaration.name, 'Bash')
assert.equal(
  ((bashDeclaration.parameters as never).properties.timeout as never).nullable,
  true,
)

const mcpSchema = normalizeGeminiToolParameterSchema({
  type: 'object',
  properties: {},
  additionalProperties: true,
})
assert.deepEqual(mcpSchema, { type: 'object', properties: {} })

const boundedIntegerSchema = normalizeGeminiToolParameterSchema({
  type: 'object',
  properties: {
    limit: {
      type: 'integer',
      minimum: 1,
      exclusiveMinimum: 0,
      maximum: 10,
      exclusiveMaximum: 11,
    },
    choice: {
      oneOf: [
        { type: 'string', enum: ['a'] },
        { type: 'string', enum: ['b'] },
      ],
    },
  },
  required: ['limit'],
})
assert.equal(
  'exclusiveMinimum' in ((boundedIntegerSchema.properties as never).limit as never),
  false,
)
assert.equal(
  'exclusiveMaximum' in ((boundedIntegerSchema.properties as never).limit as never),
  false,
)
assert.deepEqual(
  ((boundedIntegerSchema.properties as never).choice as never).enum,
  ['a', 'b'],
)

assert.equal(validateGeminiFunctionName('mcp__server__tool'), null)
assert.match(validateGeminiFunctionName('bad-tool') ?? '', /invalid/)

const replay = collectGeminiContents({
  messages: [
    {
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'call_image',
            name: 'ReadImage',
            input: { path: 'image.png' },
            providerMetadata: {
              gemini: {
                thoughtSignature: 'sig-image',
                functionName: 'ReadImage',
                requiresThoughtSignature: true,
              },
            },
          },
        ],
      },
    },
    {
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'call_image',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'aW1hZ2U=',
                },
              },
            ],
          },
        ],
      },
    },
  ] as never,
})
assert.equal(replay.validationError, undefined)
assert.equal(replay.contents[0]?.parts[0]?.thoughtSignature, 'sig-image')
assert.equal(
  replay.contents[1]?.parts[0]?.functionResponse?.name,
  'ReadImage',
)
assert.match(
  replay.contents[1]?.parts[0]?.functionResponse?.response.content as string,
  /image\/png/,
)

const largeResult = collectGeminiContents({
  messages: [
    {
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'call_large',
            name: 'LargeJson',
            input: {},
          },
        ],
      },
    },
    {
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'call_large',
            content: [{ type: 'text', text: 'x'.repeat(200_000) }],
          },
        ],
      },
    },
  ] as never,
})
assert.equal(
  String(largeResult.contents[1]?.parts[0]?.functionResponse?.response.content)
    .length,
  200_000,
)

console.log('gemini-tool-schema self-test passed')
