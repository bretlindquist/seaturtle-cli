#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeSendMessageSummary } from '../source/src/tools/SendMessageTool/messageSummary.js'

const repoRoot = join(import.meta.dirname, '..')
const sendMessageToolSource = readFileSync(
  join(repoRoot, 'source/src/tools/SendMessageTool/SendMessageTool.ts'),
  'utf8',
)

assert.equal(
  normalizeSendMessageSummary(undefined, 'Investigate flaky test failures today'),
  'Investigate flaky test failures today',
  'plain-text SendMessage should derive summary from message content',
)
assert.equal(
  normalizeSendMessageSummary('  assign task 1  ', 'ignored'),
  'assign task 1',
  'explicit summaries should be trimmed and preserved',
)
assert.equal(
  normalizeSendMessageSummary(undefined, 'First line\nSecond line'),
  'First line…',
  'derived summaries should stay single-line',
)

assert.doesNotMatch(
  sendMessageToolSource,
  /summary is required when message is a string/,
  'plain-text SendMessage should not hard-require summary anymore',
)
assert.match(
  sendMessageToolSource,
  /Create a team with TeamCreate first, or set CLAUDE_CODE_TEAM_NAME\./,
  'broadcast guidance should point at TeamCreate',
)

console.log('send-message tool self-test passed')
