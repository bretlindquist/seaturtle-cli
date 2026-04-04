import { randomUUID } from 'crypto'
import { useEffect, useMemo, useRef } from 'react'
import { useMailbox } from '../context/mailbox.js'
import type { Message } from '../types/message.js'
import { extractTextContent, stripPromptXMLTags } from '../utils/messages.js'
import { logForDebugging } from '../utils/debug.js'
import { errorMessage } from '../utils/errors.js'
import type { TelegramUpdate } from '../services/telegram/client.js'
import {
  getTelegramUpdates,
  sendTelegramMessage,
  splitTelegramMessage,
} from '../services/telegram/client.js'
import { getTelegramConfig } from '../services/telegram/config.js'

type PendingTelegramResponse = {
  chatId: string
  startIndex: number | null
}

type Props = {
  isLoading: boolean
  messages: Message[]
}

function getInboundText(update: TelegramUpdate): {
  chatId: string
  text: string
} | null {
  const text = update.message?.text?.trim()
  const chatId = update.message?.chat.id
  if (!text || chatId === undefined) {
    return null
  }
  return {
    chatId: String(chatId),
    text,
  }
}

function getOutboundText(messages: Message[], startIndex: number): string | null {
  for (const message of messages.slice(startIndex)) {
    if (message.type === 'assistant' && !message.isApiErrorMessage) {
      const text = extractTextContent(message.message.content, '\n\n').trim()
      if (text) {
        return text
      }
    }

    if (
      message.type === 'system' &&
      message.subtype === 'local_command' &&
      message.content.includes('<local-command-stdout>')
    ) {
      const text = stripPromptXMLTags(message.content).trim()
      if (text && text !== 'No content') {
        return text
      }
    }
  }

  return null
}

export function useTelegramBridge({ isLoading, messages }: Props): void {
  const mailbox = useMailbox()
  const config = useMemo(() => getTelegramConfig(), [])
  const offsetRef = useRef<number | undefined>(undefined)
  const pendingResponsesRef = useRef<PendingTelegramResponse[]>([])
  const previousLoadingRef = useRef(isLoading)

  useEffect(() => {
    if (!config) {
      return
    }

    let cancelled = false
    let abortController: AbortController | null = null

    const poll = async () => {
      while (!cancelled) {
        abortController = new AbortController()
        try {
          const updates = await getTelegramUpdates(
            config,
            offsetRef.current,
            abortController.signal,
          )

          for (const update of updates) {
            offsetRef.current = update.update_id + 1
            const inbound = getInboundText(update)
            if (!inbound) {
              continue
            }
            if (!config.allowedChatIds.has(inbound.chatId)) {
              continue
            }

            pendingResponsesRef.current.push({
              chatId: inbound.chatId,
              startIndex: null,
            })
            mailbox.send({
              id: randomUUID(),
              source: 'user',
              content: inbound.text,
              from: `telegram:${inbound.chatId}`,
              timestamp: new Date().toISOString(),
            })
          }
        } catch (error) {
          if (cancelled || abortController.signal.aborted) {
            return
          }
          logForDebugging(
            `[telegram] poll failed: ${errorMessage(error)}`,
            { level: 'error' },
          )
          await new Promise(resolve => setTimeout(resolve, 2_000))
        }
      }
    }

    void poll()

    return () => {
      cancelled = true
      abortController?.abort()
    }
  }, [config, mailbox])

  useEffect(() => {
    if (!config) {
      previousLoadingRef.current = isLoading
      return
    }

    const queue = pendingResponsesRef.current
    const wasLoading = previousLoadingRef.current

    if (!wasLoading && isLoading) {
      const pending = queue.find(item => item.startIndex === null)
      if (pending) {
        pending.startIndex = messages.length
      }
    }

    if (wasLoading && !isLoading) {
      const pending = queue[0]
      if (pending && pending.startIndex !== null) {
        const outboundText =
          getOutboundText(messages, pending.startIndex) ?? 'Done.'
        void (async () => {
          try {
            for (const chunk of splitTelegramMessage(outboundText)) {
              await sendTelegramMessage(config, pending.chatId, chunk)
            }
          } catch (error) {
            logForDebugging(
              `[telegram] send failed: ${errorMessage(error)}`,
              { level: 'error' },
            )
          }
        })()
        queue.shift()
      }
    }

    previousLoadingRef.current = isLoading
  }, [config, isLoading, messages])
}
