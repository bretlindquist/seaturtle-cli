import assert from 'node:assert/strict'

import {
  getCtGreetingPrompt,
  getCtGreetingPromptInventory,
  getCtGreetingPromptTotalCount,
  pickCtGreeting,
} from '../source/src/services/projectIdentity/lore.ts'

function run(): void {
  const inventory = getCtGreetingPromptInventory()

  assert.deepEqual(inventory, {
    brisk: 9,
    curious: 9,
    mischievous: 9,
    steady: 9,
    warm: 9,
    reflective: 9,
  })
  assert.equal(
    getCtGreetingPromptTotalCount(),
    54,
    'startup greeting pool should stay above the 50-line production floor',
  )

  for (const [disposition, count] of Object.entries(inventory)) {
    const uniquePrompts = new Set<string>()
    for (let index = 0; index < count; index++) {
      const prompt = getCtGreetingPrompt(disposition as keyof typeof inventory, index)
      assert.ok(prompt.trim().length > 0, `${disposition} prompt ${index} should not be empty`)
      uniquePrompts.add(prompt)
    }
    assert.equal(
      uniquePrompts.size,
      count,
      `${disposition} startup greetings should stay distinct within their own lane`,
    )
  }

  const seed = 'status:greeting:selftest'
  const first = pickCtGreeting(seed)
  const second = pickCtGreeting(seed)
  assert.deepEqual(
    second,
    first,
    'greeting selection should stay deterministic for the same seed',
  )

  const warmPrompt = getCtGreetingPrompt('warm', 0)
  assert.match(
    warmPrompt,
    /\?$/,
    'startup greeting prompts should remain reply-shaped openings',
  )
}

run()
console.log('ct greeting self-test passed')
