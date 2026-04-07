import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { RenderableMessage } from '../../types/message.js';
import { renderableSearchText } from '../../utils/transcriptSearch.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';

type UseStaticTranscriptJumpInput = {
  enabled: boolean;
  messages: RenderableMessage[];
  jumpRef: RefObject<JumpHandle | null>;
  searchProgress: TranscriptSearchProgressSink;
};

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (from <= haystack.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    count += 1;
    from = idx + Math.max(needle.length, 1);
  }
  return count;
}

export function useStaticTranscriptJump({
  enabled,
  messages,
  jumpRef,
  searchProgress,
}: UseStaticTranscriptJumpInput): void {
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const stateRef = useRef({
    query: '',
    count: 0,
    current: 0,
  });

  const handle = useMemo<JumpHandle>(
    () => ({
      jumpToIndex: () => {},
      setAnchor: () => {},
      warmSearchIndex: async () => 0,
      disarmSearch: () => {},
      setSearchQuery: (query: string) => {
        const normalized = query.toLowerCase();
        if (!normalized) {
          stateRef.current = {
            query: '',
            count: 0,
            current: 0,
          };
          searchProgress.reportMatches(0, 0);
          return;
        }

        const count = messagesRef.current.reduce(
          (sum, msg) => sum + countOccurrences(renderableSearchText(msg), normalized),
          0,
        );
        const current =
          count === 0
            ? 0
            : stateRef.current.query === normalized &&
                stateRef.current.current > 0 &&
                stateRef.current.current <= count
              ? stateRef.current.current
              : 1;

        stateRef.current = {
          query: normalized,
          count,
          current,
        };
        searchProgress.reportMatches(count, current);
      },
      nextMatch: () => {
        const { count, current } = stateRef.current;
        if (count === 0) return;
        const next = current >= count ? 1 : current + 1;
        stateRef.current.current = next;
        searchProgress.reportMatches(count, next);
      },
      prevMatch: () => {
        const { count, current } = stateRef.current;
        if (count === 0) return;
        const next = current <= 1 ? count : current - 1;
        stateRef.current.current = next;
        searchProgress.reportMatches(count, next);
      },
    }),
    [searchProgress],
  );

  useEffect(() => {
    if (!enabled) return;
    jumpRef.current = handle;
    return () => {
      if (jumpRef.current === handle) {
        jumpRef.current = null;
      }
    };
  }, [enabled, handle, jumpRef]);
}
