import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import {
  buildTelegramInboundQueuedCommand,
  getTelegramCapabilityModeHelp,
  getTelegramCapabilityModeLabel,
  getTelegramPromptModeForCapability,
  resolveTelegramCapabilityMode,
} from '../source/src/services/telegram/runtimeContract.js'
import type { TelegramInboundPayload } from '../source/src/services/telegram/media.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function run(): void {
  assert(
    resolveTelegramCapabilityMode(undefined) === 'research',
    'expected missing capability mode to default to research',
  )
  assert(
    resolveTelegramCapabilityMode('convo') === 'convo',
    'expected convo capability mode to survive normalization',
  )
  assert(
    getTelegramPromptModeForCapability('research') === 'research',
    'expected research capability to route into research mode',
  )
  assert(
    getTelegramPromptModeForCapability('convo') === 'convo',
    'expected convo capability to route into convo mode',
  )
  assert(
    getTelegramCapabilityModeLabel('research') === 'Research',
    'expected research label to stay human-readable',
  )
  assert(
    getTelegramCapabilityModeHelp('convo').includes('back-and-forth'),
    'expected convo help to describe conversational behavior',
  )

  const textCommand = buildTelegramInboundQueuedCommand(
    {
      kind: 'text',
      chatId: '123',
      text: '/todo keep this as text',
    },
    'research',
  )
  assert(textCommand !== null, 'expected text payload to become a queued command')
  assert(textCommand.mode === 'research', 'expected text payload to inherit research mode')
  assert(
    textCommand.skipSlashCommands === true,
    'expected Telegram text to stay plain text, not a local slash command',
  )

  const promptBlocks: ContentBlockParam[] = [{ type: 'text', text: 'photo note' }]
  const promptCommand = buildTelegramInboundQueuedCommand(
    {
      kind: 'prompt',
      chatId: '456',
      content: promptBlocks,
    } satisfies TelegramInboundPayload,
    'convo',
  )
  assert(promptCommand !== null, 'expected prompt payload to become a queued command')
  assert(promptCommand.mode === 'convo', 'expected prompt payload to inherit convo mode')
  assert(
    promptCommand.value === promptBlocks,
    'expected prompt payload to preserve original content blocks',
  )

  const noticeCommand = buildTelegramInboundQueuedCommand(
    {
      kind: 'notice',
      chatId: '789',
      text: 'Pairing notice',
    },
    'research',
  )
  assert(noticeCommand === null, 'expected notice payloads to bypass queue creation')
}

run()
