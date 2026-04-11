import { feature } from 'bun:bundle';
import { logEvent } from '../../services/analytics/index.js';
import { enqueue } from '../../utils/messageQueueManager.js';
import { getCurrentTurnTokenBudget, snapshotOutputTokensForTurn } from '../../bootstrap/state.js';
import { parseTokenBudget } from '../../utils/tokenBudget.js';

type MessageLike = {
  type: string
  isMeta?: boolean
  message?: {
    content: unknown
  }
}

export function handleConcurrentReplQuery({
  newMessages,
  getContentText,
}: {
  newMessages: MessageLike[]
  getContentText: (content: unknown) => string | null
}) {
  logEvent('tengu_concurrent_onquery_detected', {});

  newMessages
    .filter((message): message is MessageLike => message.type === 'user' && !message.isMeta)
    .map(message => getContentText(message.message?.content))
    .filter((text): text is string => text !== null)
    .forEach((msg, index) => {
      enqueue({
        value: msg,
        mode: 'prompt',
      });
      if (index === 0) {
        logEvent('tengu_concurrent_onquery_enqueued', {});
      }
    });
}

export async function prepareReplQueryAttempt<TMessage>({
  newMessages,
  input,
  resetTimingRefs,
  setMessages,
  responseLengthRef,
  apiMetricsRef,
  setStreamingToolUses,
  setStreamingText,
  messagesRef,
  mrOnBeforeQuery,
  onBeforeQueryCallback,
}: {
  newMessages: TMessage[]
  input: string | undefined
  resetTimingRefs: () => void
  setMessages: React.Dispatch<React.SetStateAction<TMessage[]>>
  responseLengthRef: React.RefObject<number>
  apiMetricsRef: React.RefObject<any[]>
  setStreamingToolUses: React.Dispatch<React.SetStateAction<any[]>>
  setStreamingText: (value: string | null) => void
  messagesRef: React.RefObject<TMessage[]>
  mrOnBeforeQuery: (
    input: string,
    latestMessages: TMessage[],
    newMessageCount: number,
  ) => Promise<void>
  onBeforeQueryCallback?: (input: string, newMessages: TMessage[]) => Promise<boolean>
}) {
  resetTimingRefs();
  setMessages(oldMessages => [...oldMessages, ...newMessages]);
  responseLengthRef.current = 0;

  if (feature('TOKEN_BUDGET')) {
    const parsedBudget = input ? parseTokenBudget(input) : null;
    snapshotOutputTokensForTurn(parsedBudget ?? getCurrentTurnTokenBudget());
  }

  apiMetricsRef.current = [];
  setStreamingToolUses([]);
  setStreamingText(null);

  const latestMessages = messagesRef.current;

  if (input) {
    await mrOnBeforeQuery(input, latestMessages, newMessages.length);
  }

  if (onBeforeQueryCallback && input) {
    const shouldProceed = await onBeforeQueryCallback(input, latestMessages);
    if (!shouldProceed) {
      return {
        shouldProceed: false as const,
        latestMessages,
      };
    }
  }

  return {
    shouldProceed: true as const,
    latestMessages,
  };
}
