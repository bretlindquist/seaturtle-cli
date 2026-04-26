#!/usr/bin/env bun

import assert from 'node:assert/strict'
import {
  HISTORICAL_MULTIMODAL_MESSAGE_RETENTION_COUNT,
  RETAINED_MULTIMODAL_PLACEHOLDER_DATA,
  pruneHistoricalUserMultimodalMessages,
  sanitizeStoredUserMultimodalMessage,
  stripRetainedMultimodalPlaceholdersFromUserMessage,
} from '../source/src/utils/userMultimodalRetention.ts'

const baseUserMessage = (content: unknown, imagePasteIds?: number[]) =>
  ({
    type: 'user',
    message: {
      role: 'user',
      content,
    },
    uuid: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...(imagePasteIds ? { imagePasteIds } : {}),
  }) as const

const imageMessage = baseUserMessage(
  [
    { type: 'text', text: 'see attached' },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: 'AAAABBBBCCCC',
      },
    },
  ],
  [7],
)

const sanitizedImageMessage = sanitizeStoredUserMultimodalMessage(imageMessage)
assert.notEqual(
  sanitizedImageMessage,
  imageMessage,
  'historical multimodal user messages should be sanitized',
)
assert.equal(
  (sanitizedImageMessage.message.content as Array<Record<string, unknown>>)[1]
    ?.type,
  'image',
  'sanitized historical image should stay renderable as an image block',
)
assert.equal(
  (
    (sanitizedImageMessage.message.content as Array<Record<string, unknown>>)[1]
      ?.source as { data?: string }
  )?.data,
  RETAINED_MULTIMODAL_PLACEHOLDER_DATA,
  'sanitized historical image should replace raw base64 with a lightweight sentinel',
)

const strippedForApi = stripRetainedMultimodalPlaceholdersFromUserMessage(
  sanitizedImageMessage,
)
assert.deepEqual(
  strippedForApi.message.content,
  [{ type: 'text', text: 'see attached' }],
  'API-bound copy should drop stripped multimodal placeholders',
)

const documentMessage = baseUserMessage([
  {
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: 'PDFPDFPDF',
    },
    filename: 'notes.pdf',
  },
])
const sanitizedDocumentMessage =
  sanitizeStoredUserMultimodalMessage(documentMessage as never)
assert.deepEqual(
  sanitizedDocumentMessage.message.content,
  [{ type: 'text', text: '[Document omitted from retained context: notes.pdf]' }],
  'historical documents should be replaced with a lightweight text placeholder',
)

const pruned = pruneHistoricalUserMultimodalMessages([
  imageMessage as never,
  baseUserMessage(
    [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'DDDDEEEEFFFF',
        },
      },
    ],
    [8],
  ) as never,
  baseUserMessage(
    [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'GGGGHHHHIIII',
        },
      },
    ],
    [9],
  ) as never,
])

assert.equal(
  (
    ((pruned[0] as typeof imageMessage).message.content as Array<Record<string, unknown>>)[1]
      ?.source as { data?: string }
  )?.data,
  RETAINED_MULTIMODAL_PLACEHOLDER_DATA,
  'older multimodal messages should be sanitized once the retention window is exceeded',
)
assert.equal(
  (
    ((pruned[1] as typeof imageMessage).message.content as Array<Record<string, unknown>>)[0]
      ?.source as { data?: string }
  )?.data,
  'DDDDEEEEFFFF',
  'recent multimodal messages inside the retention window should stay intact',
)
assert.equal(
  (
    ((pruned[2] as typeof imageMessage).message.content as Array<Record<string, unknown>>)[0]
      ?.source as { data?: string }
  )?.data,
  'GGGGHHHHIIII',
  'latest multimodal message should stay intact',
)
assert.equal(
  HISTORICAL_MULTIMODAL_MESSAGE_RETENTION_COUNT,
  2,
  'retention window should stay small and explicit',
)

console.log('user multimodal retention self-test passed')
