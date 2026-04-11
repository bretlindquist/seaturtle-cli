import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

  const repoRoot = join(import.meta.dir, '..')
  const transcriptModeSource = readFileSync(
    join(repoRoot, 'source/src/screens/repl/ReplTranscriptMode.tsx'),
    'utf8',
  )
  const transcriptHelpersSource = readFileSync(
    join(repoRoot, 'source/src/screens/repl/ReplShellHelpers.tsx'),
    'utf8',
  )
  const staticJumpSource = readFileSync(
    join(repoRoot, 'source/src/screens/repl/useStaticTranscriptJump.ts'),
    'utf8',
  )
  const virtualMessageListSource = readFileSync(
    join(repoRoot, 'source/src/components/VirtualMessageList.tsx'),
    'utf8',
  )

  assert.match(
    transcriptModeSource,
    /searchBadge=\{searchBadge\}/,
    'transcript mode should pass the shared search badge into the search bar/footer surface',
  )
  assert.doesNotMatch(
    transcriptModeSource,
    /count=\{searchCount\}|current=\{searchCurrent\}/,
    'transcript mode should not pass duplicate count/current props alongside the badge',
  )
  assert.match(
    transcriptHelpersSource,
    /searchBadge\.current\}\/\{searchBadge\.count/,
    'search bar should render transcript navigation state from the shared search badge',
  )
  assert.match(
    staticJumpSource,
    /reportTranscriptSearchEngineBadge\(searchProgress, engine\)/,
    'static transcript adapter should report empty and populated badge state through the shared engine helper',
  )
  assert.doesNotMatch(
    staticJumpSource,
    /searchProgress\.reportMatches\(0,\s*0\)/,
    'static transcript adapter should not hand-roll empty badge reporting',
  )
  assert.match(
    virtualMessageListSource,
    /reportTranscriptSearchEngineBadge\(searchProgress, currentState\)/,
    'virtual transcript adapter should report active badge state through the shared engine helper',
  )
  assert.doesNotMatch(
    virtualMessageListSource,
    /const reportSearchProgress = useCallback/,
    'virtual transcript adapter should not keep a separate local badge-reporting helper',
  )
}

run()
console.log('transcript search engine self-test passed')
