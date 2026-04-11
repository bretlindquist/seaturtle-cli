import { createTelegramTypingLifecycle } from '../source/src/services/telegram/typingLifecycle.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function run(): Promise<void> {
  const events: string[] = []
  const lifecycle = createTelegramTypingLifecycle(async chatId => {
    events.push(chatId)
  }, 20)

  lifecycle.start('chat-a')
  await Bun.sleep(5)
  assert(events.length === 1, `expected immediate send, saw ${events.length}`)

  lifecycle.start('chat-a')
  await Bun.sleep(5)
  assert(events.length === 1, 'expected no duplicate timer for same chat')

  await Bun.sleep(30)
  assert(events.length >= 2, 'expected refresh send while lifecycle is active')

  lifecycle.stop('chat-a')
  const afterStop = events.length
  await Bun.sleep(35)
  assert(events.length === afterStop, 'expected no sends after stop')

  lifecycle.start('chat-a')
  lifecycle.start('chat-b')
  await Bun.sleep(5)
  assert(events.includes('chat-a') && events.includes('chat-b'), 'expected multi-chat typing support')
  lifecycle.stopAll()
}

await run()
