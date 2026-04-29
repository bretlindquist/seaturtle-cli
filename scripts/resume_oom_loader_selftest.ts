#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const jsonSource = readFileSync(
  new URL('../source/src/utils/json.ts', import.meta.url),
  'utf8',
)

assert(
  jsonSource.includes('export function forEachJSONL<T>('),
  'expected json utils to expose an incremental JSONL iterator for large-session load paths',
)

const sessionStorageSource = readFileSync(
  new URL('../source/src/utils/sessionStorage.ts', import.meta.url),
  'utf8',
)

assert(
  sessionStorageSource.includes("forEachJSONL<Entry>(metadataLines.join('\\n'), applyMetadataEntry)"),
  'expected pre-boundary metadata recovery to use the incremental JSONL iterator',
)

assert(
  sessionStorageSource.includes('forEachJSONL<Entry>(buf, entry => {'),
  'expected transcript loading to process entries incrementally instead of materializing a full parsed array',
)

assert(
  !sessionStorageSource.includes('const entries = parseJSONL<Entry>(buf)'),
  'large-session transcript loading should not materialize a full entries array before resume reconstruction',
)

assert(
  !sessionStorageSource.includes('const allMessages = [...messages.values()]'),
  'leaf detection should not clone the full transcript message map into an array',
)

assert(
  sessionStorageSource.includes('for (const terminal of messages.values()) {'),
  'expected leaf detection to iterate message values directly',
)

console.log('resume_oom_loader_selftest: ok')
