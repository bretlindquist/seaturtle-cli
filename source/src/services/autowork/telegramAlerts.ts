import { basename } from 'path'
import { getTelegramConfig, getCurrentProjectTelegramBindingSnapshot } from '../telegram/config.js'
import { sendTelegramMessage } from '../telegram/client.js'
import { logError } from '../../utils/log.js'
import type { AutoworkContinuationDebt } from './state.js'

export type AutoworkTelegramAlertResult =
  | { ok: true; chatId: string }
  | {
      ok: false
      code:
        | 'telegram_disabled'
        | 'telegram_not_configured'
        | 'telegram_no_target_chat'
        | 'telegram_send_failed'
    }

function selectTargetChatId(): string | null {
  const config = getTelegramConfig()
  if (!config) {
    return null
  }

  return (
    config.defaultChatId ??
    config.lastInboundChatId ??
    Array.from(config.allowedChatIds)[0] ??
    null
  )
}

function buildAutoworkStopMessage(params: {
  repoRoot: string
  code: string
  message: string
  failedCheck?: string
  chunkId?: string
}): string {
  return [
    'SeaTurtle autowork stopped.',
    '',
    `Project: ${basename(params.repoRoot) || params.repoRoot}`,
    params.chunkId ? `Chunk: ${params.chunkId}` : null,
    `Code: ${params.code}`,
    params.failedCheck ? `Failed check: ${params.failedCheck}` : null,
    `Reason: ${params.message}`,
    '',
    'Next step: open CT in this repo and run /autowork doctor.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildAutoworkDebtMessage(params: {
  repoRoot: string
  chunkId: string
  debts: readonly AutoworkContinuationDebt[]
  nextPendingChunkId?: string | null
}): string {
  return [
    'SeaTurtle autowork continued in dangerous mode.',
    '',
    `Project: ${basename(params.repoRoot) || params.repoRoot}`,
    `Chunk: ${params.chunkId}`,
    '',
    'Checkpoint debt:',
    ...params.debts.map(debt =>
      debt.failedCheck
        ? `- ${debt.code}: ${debt.message} [${debt.failedCheck}]`
        : `- ${debt.code}: ${debt.message}`,
    ),
    '',
    `Next chunk: ${params.nextPendingChunkId ?? 'none'}`,
    'Next step: open CT in this repo and run /autowork doctor.',
  ].join('\n')
}

export async function sendAutoworkTelegramStopNotice(params: {
  repoRoot: string
  telegramEscalationEnabled: boolean
  code: string
  message: string
  failedCheck?: string
  chunkId?: string
}): Promise<AutoworkTelegramAlertResult> {
  if (!params.telegramEscalationEnabled) {
    return { ok: false, code: 'telegram_disabled' }
  }

  const config = getTelegramConfig()
  if (!config) {
    return { ok: false, code: 'telegram_not_configured' }
  }

  const chatId =
    getCurrentProjectTelegramBindingSnapshot()?.defaultChatId ??
    getCurrentProjectTelegramBindingSnapshot()?.lastInboundChatId ??
    selectTargetChatId()

  if (!chatId) {
    return { ok: false, code: 'telegram_no_target_chat' }
  }

  try {
    await sendTelegramMessage(
      config,
      chatId,
      buildAutoworkStopMessage(params),
    )
    return { ok: true, chatId }
  } catch (error) {
    logError(error)
    return { ok: false, code: 'telegram_send_failed' }
  }
}

export async function sendAutoworkTelegramDebtNotice(params: {
  repoRoot: string
  telegramEscalationEnabled: boolean
  chunkId: string
  debts: readonly AutoworkContinuationDebt[]
  nextPendingChunkId?: string | null
}): Promise<AutoworkTelegramAlertResult> {
  if (!params.telegramEscalationEnabled) {
    return { ok: false, code: 'telegram_disabled' }
  }

  const config = getTelegramConfig()
  if (!config) {
    return { ok: false, code: 'telegram_not_configured' }
  }

  const chatId =
    getCurrentProjectTelegramBindingSnapshot()?.defaultChatId ??
    getCurrentProjectTelegramBindingSnapshot()?.lastInboundChatId ??
    selectTargetChatId()

  if (!chatId) {
    return { ok: false, code: 'telegram_no_target_chat' }
  }

  try {
    await sendTelegramMessage(
      config,
      chatId,
      buildAutoworkDebtMessage(params),
    )
    return { ok: true, chatId }
  } catch (error) {
    logError(error)
    return { ok: false, code: 'telegram_send_failed' }
  }
}
