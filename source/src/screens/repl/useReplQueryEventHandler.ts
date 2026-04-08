import { feature } from 'bun:bundle';
import { randomUUID } from 'crypto';
import { useCallback } from 'react';
import {
  getMessagesAfterCompactBoundary,
  handleMessageFromStream,
  isCompactBoundaryMessage,
  type StreamingThinking,
  type StreamingToolUse,
} from '../../utils/messages.js';
import { isEphemeralToolProgress } from '../../utils/sessionStorage.js';
import { removeTranscriptMessage } from '../../utils/sessionStorage.js';

type ApiMetricEntry = {
  ttftMs: number
  firstTokenTime: number
  lastTokenTime: number
  responseLengthBaseline: number
  endResponseLength: number
}

type UseReplQueryEventHandlerInput = {
  setMessages: React.Dispatch<React.SetStateAction<any[]>>
  setConversationId: (id: string) => void
  setResponseLength: (f: (prev: number) => number) => void
  setStreamMode: (mode: any) => void
  setStreamingToolUses: React.Dispatch<
    React.SetStateAction<StreamingToolUse[]>
  >
  setStreamingThinking: React.Dispatch<
    React.SetStateAction<StreamingThinking | null>
  >
  onStreamingText?: (f: (current: string | null) => string | null) => void
  responseLengthRef: React.RefObject<number>
  apiMetricsRef: React.RefObject<ApiMetricEntry[]>
  proactiveModule: {
    setContextBlocked: (blocked: boolean) => void
  } | null
  isFullscreenEnabled: () => boolean
}

export function useReplQueryEventHandler({
  setMessages,
  setConversationId,
  setResponseLength,
  setStreamMode,
  setStreamingToolUses,
  setStreamingThinking,
  onStreamingText,
  responseLengthRef,
  apiMetricsRef,
  proactiveModule,
  isFullscreenEnabled,
}: UseReplQueryEventHandlerInput) {
  return useCallback(
    (event: Parameters<typeof handleMessageFromStream>[0]) => {
      handleMessageFromStream(
        event,
        newMessage => {
          if (isCompactBoundaryMessage(newMessage)) {
            if (isFullscreenEnabled()) {
              setMessages(old => [
                ...getMessagesAfterCompactBoundary(old, {
                  includeSnipped: true,
                }),
                newMessage,
              ]);
            } else {
              setMessages(() => [newMessage]);
            }
            setConversationId(randomUUID());
            if (feature('PROACTIVE') || feature('KAIROS')) {
              proactiveModule?.setContextBlocked(false);
            }
          } else if (
            newMessage.type === 'progress' &&
            isEphemeralToolProgress(newMessage.data.type)
          ) {
            setMessages(oldMessages => {
              const last = oldMessages.at(-1);
              if (
                last?.type === 'progress' &&
                last.parentToolUseID === newMessage.parentToolUseID &&
                last.data.type === newMessage.data.type
              ) {
                const copy = oldMessages.slice();
                copy[copy.length - 1] = newMessage;
                return copy;
              }
              return [...oldMessages, newMessage];
            });
          } else {
            setMessages(oldMessages => [...oldMessages, newMessage]);
          }

          if (feature('PROACTIVE') || feature('KAIROS')) {
            if (
              newMessage.type === 'assistant' &&
              'isApiErrorMessage' in newMessage &&
              newMessage.isApiErrorMessage
            ) {
              proactiveModule?.setContextBlocked(true);
            } else if (newMessage.type === 'assistant') {
              proactiveModule?.setContextBlocked(false);
            }
          }
        },
        newContent => {
          setResponseLength(length => length + newContent.length);
        },
        setStreamMode,
        setStreamingToolUses,
        tombstonedMessage => {
          setMessages(oldMessages =>
            oldMessages.filter(m => m !== tombstonedMessage),
          );
          void removeTranscriptMessage(tombstonedMessage.uuid);
        },
        setStreamingThinking,
        metrics => {
          const now = Date.now();
          const baseline = responseLengthRef.current;
          apiMetricsRef.current.push({
            ...metrics,
            firstTokenTime: now,
            lastTokenTime: now,
            responseLengthBaseline: baseline,
            endResponseLength: baseline,
          });
        },
        onStreamingText,
      );
    },
    [
      apiMetricsRef,
      isFullscreenEnabled,
      onStreamingText,
      proactiveModule,
      responseLengthRef,
      setConversationId,
      setMessages,
      setResponseLength,
      setStreamMode,
      setStreamingThinking,
      setStreamingToolUses,
    ],
  );
}
