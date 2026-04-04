import { randomUUID } from 'crypto'
import { useEffect, useMemo, useRef } from 'react'
import { useMailbox } from '../context/mailbox.js'
import type { Message } from '../types/message.js'
import { enqueue } from '../utils/messageQueueManager.js'
import { extractTextContent, stripPromptXMLTags } from '../utils/messages.js'
import { logForDebugging } from '../utils/debug.js'
import { errorMessage } from '../utils/errors.js'
import {
  sendTelegramDocument,
  sendTelegramMessage,
  sendTelegramPhoto,
  splitTelegramMessage,
  getTelegramUpdates,
} from '../services/telegram/client.js'
import { getTelegramConfig } from '../services/telegram/config.js'
import {
  classifyTelegramOutboundAttachments,
  resolveTelegramInboundPayload,
} from '../services/telegram/media.js'

type PendingTelegramResponse = {
  chatId: string
  startIndex: number | null
}

type Props = {
  isLoading: boolean
  messages: Message[]
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

type TelegramOutboundPayload = {
  text: string | null
  photos: string[]
  documents: string[]
}

function stripAttachmentOnlyLines(
  text: string,
  attachments: { photos: string[]; documents: string[] },
): string {
  const attachmentSet = new Set([...attachments.photos, ...attachments.documents])
  const normalizeAttachmentLine = (line: string): string => {
    let normalized = line.trim()
    if (normalized.startsWith('@')) {
      normalized = normalized.slice(1).trim()
    }
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1)
    }
    return normalized
  }

  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      if (!trimmed) {
        return true
      }
      if (attachmentSet.has(normalizeAttachmentLine(trimmed))) {
        return false
      }
      if (
        trimmed.startsWith('Path: ') &&
        attachmentSet.has(
          normalizeAttachmentLine(trimmed.slice('Path: '.length).trim()),
        )
      ) {
        return false
      }
      return true
    })
    .join('\n')
    .trim()
}

async function getOutboundPayload(
  messages: Message[],
  startIndex: number,
): Promise<TelegramOutboundPayload> {
  const text = getOutboundText(messages, startIndex)
  if (!text) {
    return {
      text: null,
      photos: [],
      documents: [],
    }
  }

  const attachments = await classifyTelegramOutboundAttachments(text)
  return {
    text: stripAttachmentOnlyLines(text, attachments) || null,
    photos: attachments.photos,
    documents: attachments.documents,
  }
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
            const inbound = await resolveTelegramInboundPayload(config, update)
            if (!inbound) {
              continue
            }
            if (!config.allowedChatIds.has(inbound.chatId)) {
              continue
            }

            if (inbound.kind === 'notice') {
              await sendTelegramMessage(config, inbound.chatId, inbound.text)
              continue
            }

            pendingResponsesRef.current.push({
              chatId: inbound.chatId,
              startIndex: null,
            })
            if (inbound.kind === 'text') {
              mailbox.send({
                id: randomUUID(),
                source: 'user',
                content: inbound.text,
                from: `telegram:${inbound.chatId}`,
                timestamp: new Date().toISOString(),
              })
            } else {
              enqueue({
                value: inbound.content,
                mode: 'prompt',
                skipSlashCommands: true,
              })
            }
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
        void (async () => {
          try {
            const outbound = await getOutboundPayload(messages, pending.startIndex)

            for (const photoPath of outbound.photos) {
              await sendTelegramPhoto(config, pending.chatId, photoPath)
            }
            for (const documentPath of outbound.documents) {
              await sendTelegramDocument(config, pending.chatId, documentPath)
            }

            const outboundText = outbound.text ?? 'Done.'
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
