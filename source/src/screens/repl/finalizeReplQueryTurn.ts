import { feature } from 'bun:bundle';
import {
  getTurnClassifierCount,
  getTurnClassifierDurationMs,
  getTurnHookCount,
  getTurnHookDurationMs,
  getTurnToolCount,
  getTurnToolDurationMs,
} from '../../bootstrap/state.js';
import type { Notification } from '../../context/notifications.js';
import { formatProjectReminderNoticeText, getProjectReminder } from '../../services/remindme.js';
import { getGlobalConfigWriteCount } from '../../utils/config.js';
import { createApiMetricsMessage } from '../../utils/messages.js';
import { logQueryProfileReport } from '../../utils/queryProfiler.js';

type ApiMetricEntry = {
  ttftMs: number
  firstTokenTime: number
  lastTokenTime: number
  responseLengthBaseline: number
  endResponseLength: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export async function finalizeReplQueryTurn({
  messagesRef,
  setMessages,
  setAppState,
  apiMetricsRef,
  loadingStartTimeRef,
  resetLoadingState,
  addNotification,
  onTurnComplete,
  fireCompanionObserver,
}: {
  messagesRef: React.RefObject<any[]>
  setMessages: React.Dispatch<React.SetStateAction<any[]>>
  setAppState: (updater: (prev: any) => any) => void
  apiMetricsRef: React.RefObject<ApiMetricEntry[]>
  loadingStartTimeRef: React.RefObject<number>
  resetLoadingState: () => void
  addNotification: (notification: Notification) => void
  onTurnComplete?: (messages: any[]) => void | Promise<void>
  fireCompanionObserver: (
    messages: any[],
    onReaction: (reaction: any) => void,
  ) => Promise<void> | void
}) {
  if (feature('BUDDY')) {
    void fireCompanionObserver(messagesRef.current, reaction =>
      setAppState(prev =>
        prev.companionReaction === reaction
          ? prev
          : {
              ...prev,
              companionReaction: reaction,
            },
      ),
    );
  }

  if (feature('ANT') && apiMetricsRef.current.length > 0) {
    const entries = apiMetricsRef.current;
    const ttfts = entries.map(entry => entry.ttftMs);
    const otpsValues = entries.map(entry => {
      const delta = Math.round(
        (entry.endResponseLength - entry.responseLengthBaseline) / 4,
      );
      const samplingMs = entry.lastTokenTime - entry.firstTokenTime;
      return samplingMs > 0 ? Math.round(delta / (samplingMs / 1000)) : 0;
    });
    const isMultiRequest = entries.length > 1;
    const hookMs = getTurnHookDurationMs();
    const hookCount = getTurnHookCount();
    const toolMs = getTurnToolDurationMs();
    const toolCount = getTurnToolCount();
    const classifierMs = getTurnClassifierDurationMs();
    const classifierCount = getTurnClassifierCount();
    const turnMs = Date.now() - loadingStartTimeRef.current;

    setMessages(prev => [
      ...prev,
      createApiMetricsMessage({
        ttftMs: isMultiRequest ? median(ttfts) : ttfts[0]!,
        otps: isMultiRequest ? median(otpsValues) : otpsValues[0]!,
        isP50: isMultiRequest,
        hookDurationMs: hookMs > 0 ? hookMs : undefined,
        hookCount: hookCount > 0 ? hookCount : undefined,
        turnDurationMs: turnMs > 0 ? turnMs : undefined,
        toolDurationMs: toolMs > 0 ? toolMs : undefined,
        toolCount: toolCount > 0 ? toolCount : undefined,
        classifierDurationMs: classifierMs > 0 ? classifierMs : undefined,
        classifierCount: classifierCount > 0 ? classifierCount : undefined,
        configWriteCount: getGlobalConfigWriteCount(),
      }),
    ]);
  }

  resetLoadingState();
  logQueryProfileReport();

  const projectReminder = getProjectReminder();
  if (projectReminder) {
    addNotification({
      key: 'project-remindme',
      text: formatProjectReminderNoticeText(projectReminder),
      // Keep the reminder visible after replies until the user starts
      // typing again. Immediate toasts can temporarily preempt it, then
      // the queue restores the reminder notice.
      priority: 'medium',
      timeoutMs: 0x7fffffff,
      fold: (_current, incoming) => incoming,
    });
  }

  await onTurnComplete?.(messagesRef.current);
}
