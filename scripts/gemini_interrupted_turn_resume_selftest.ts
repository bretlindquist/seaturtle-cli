import assert from 'node:assert/strict'
import { buildInterruptedTurnResumeQueuedCommand } from '../source/src/utils/interruptedTurnResume.js'

const syntheticGeminiResume = buildInterruptedTurnResumeQueuedCommand({
  kind: 'interrupted_prompt',
  message: {
    isMeta: true,
    origin: 'human',
    message: {
      content: 'The previous turn was interrupted mid-task.',
    },
  } as never,
})

assert(syntheticGeminiResume, 'expected resume command for interrupted prompt')
assert.equal(syntheticGeminiResume.mode, 'prompt')
assert.equal(syntheticGeminiResume.value, 'The previous turn was interrupted mid-task.')
assert.equal(syntheticGeminiResume.isMeta, true)
assert.equal(syntheticGeminiResume.origin, 'human')

const visibleInterruptedPrompt = buildInterruptedTurnResumeQueuedCommand({
  kind: 'interrupted_prompt',
  message: {
    isMeta: false,
    origin: undefined,
    message: {
      content: 'retry this exact prompt',
    },
  } as never,
})

assert(visibleInterruptedPrompt, 'expected visible resume command')
assert.equal(visibleInterruptedPrompt.isMeta, undefined)
assert.equal(visibleInterruptedPrompt.value, 'retry this exact prompt')

assert.equal(buildInterruptedTurnResumeQueuedCommand({ kind: 'none' }), null)

console.log('gemini interrupted-turn resume self-test passed')
