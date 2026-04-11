import assert from 'node:assert/strict'

import {
  buildTranscriptSearchEngineState,
  getTranscriptSearchEngineCurrent,
  getTranscriptSearchEngineTotal,
  setTranscriptSearchEngineCursorToOccurrence,
} from '../source/src/screens/repl/transcriptSearchEngine.ts'
import {
  getTranscriptSearchNextCursor,
  getTranscriptSearchPreviousCursor,
} from '../source/src/screens/repl/transcriptSearchModel.ts'

type FakeMessage = {
  text: string
}

function run(): void {
  const messages: FakeMessage[] = [
    { text: 'open sea open' },
    { text: 'quiet harbor' },
    { text: 'open tide' },
  ]

  const engine = buildTranscriptSearchEngineState(
    'open',
    messages as never[],
    message => (message as FakeMessage).text.toLowerCase(),
  )

  assert.equal(
    getTranscriptSearchEngineTotal(engine),
    3,
    'engine should count transcript occurrences, not just matching messages',
  )
  assert.equal(
    getTranscriptSearchEngineCurrent(engine),
    1,
    'new transcript search queries should begin at the first occurrence',
  )

  const thirdOccurrence = setTranscriptSearchEngineCursorToOccurrence(engine, 1, 0)
  assert.equal(
    getTranscriptSearchEngineCurrent(thirdOccurrence),
    3,
    'cursor should report the ordinal of the chosen transcript occurrence',
  )

  const wrappedNext = getTranscriptSearchNextCursor(
    thirdOccurrence.snapshot,
    thirdOccurrence.cursor,
  )
  assert.deepEqual(wrappedNext, {
    ptr: 0,
    occurrenceOrdinal: 0,
  })

  const wrappedPrevious = getTranscriptSearchPreviousCursor(
    engine.snapshot,
    engine.cursor,
  )
  assert.deepEqual(wrappedPrevious, {
    ptr: 1,
    occurrenceOrdinal: 0,
  })

  const preserved = buildTranscriptSearchEngineState(
    'open',
    messages as never[],
    message => (message as FakeMessage).text.toLowerCase(),
    {
      query: 'open',
      cursor: thirdOccurrence.cursor,
    },
  )
  assert.equal(
    getTranscriptSearchEngineCurrent(preserved),
    3,
    'rebuilding the same query should preserve the existing occurrence cursor',
  )
}

run()
console.log('transcript search engine self-test passed')
