#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dirname, '..')
const processUserInputSource = readFileSync(
  join(repoRoot, 'source/src/utils/processUserInput/processUserInput.ts'),
  'utf8',
)
const historySource = readFileSync(
  join(repoRoot, 'source/src/history.ts'),
  'utf8',
)

assert.match(
  processUserInputSource,
  /export function expandStringInputPastedTextRefs\(/,
  'processUserInput should expose a dedicated pasted-text expansion helper for string input',
)
assert.match(
  processUserInputSource,
  /return pastedContents \? expandPastedTextRefs\(input, pastedContents\) : input/,
  'string-input expansion helper should delegate to the shared pasted-text reference expander',
)
assert.match(
  processUserInputSource,
  /const normalizedInput =[\s\S]*expandStringInputPastedTextRefs\(inputString, pastedContents\)/,
  'processUserInput should normalize string input with pasted-text expansion before downstream processing',
)
assert.match(
  processUserInputSource,
  /const inputMessage = getContentText\(normalizedInput\) \|\| ''/,
  'prompt submit hooks should inspect the normalized input, not the raw placeholder text',
)
assert.match(
  historySource,
  /export function expandPastedTextRefs\(/,
  'the shared pasted-text reference expander should remain available for the execution seam',
)

console.log('queued pasted-text expansion self-test passed')
