import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { RenderableMessage } from '../../types/message.js';
import { renderableSearchText } from '../../utils/transcriptSearch.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import { buildTranscriptSearchSnapshot, getTranscriptSearchCurrent, getTranscriptSearchTotal, normalizeTranscriptSearchQuery, wrapTranscriptSearchPtr } from './transcriptSearchModel.js';

type UseStaticTranscriptJumpInput = {
  enabled: boolean;
  messages: RenderableMessage[];
  jumpRef: RefObject<JumpHandle | null>;
  searchProgress: TranscriptSearchProgressSink;
};

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
    matches: [] as number[],
    ptr: 0,
  });

  const handle = useMemo<JumpHandle>(
    () => ({
      jumpToIndex: () => {},
      setAnchor: () => {},
      warmSearchIndex: async () => 0,
      disarmSearch: () => {},
      setSearchQuery: (query: string) => {
        const normalized = normalizeTranscriptSearchQuery(query);
        if (!normalized) {
          stateRef.current = {
            query: '',
            matches: [],
            ptr: 0,
          };
          searchProgress.reportMatches(0, 0);
          return;
        }

        const snapshot = buildTranscriptSearchSnapshot(
          normalized,
          messagesRef.current,
          renderableSearchText,
        );
        const count = getTranscriptSearchTotal(snapshot);
        const ptr =
          count === 0
            ? 0
            : stateRef.current.query === normalized && stateRef.current.ptr >= 0 && stateRef.current.ptr < count
              ? stateRef.current.ptr
              : 0;

        stateRef.current = {
          query: normalized,
          matches: snapshot.matches,
          ptr,
        };
        searchProgress.reportMatches(count, count > 0 ? getTranscriptSearchCurrent(ptr) : 0);
      },
      nextMatch: () => {
        const { matches, ptr } = stateRef.current;
        const count = matches.length;
        if (count === 0) return;
        const nextPtr = wrapTranscriptSearchPtr(ptr, 1, count);
        stateRef.current.ptr = nextPtr;
        searchProgress.reportMatches(count, getTranscriptSearchCurrent(nextPtr));
      },
      prevMatch: () => {
        const { matches, ptr } = stateRef.current;
        const count = matches.length;
        if (count === 0) return;
        const nextPtr = wrapTranscriptSearchPtr(ptr, -1, count);
        stateRef.current.ptr = nextPtr;
        searchProgress.reportMatches(count, getTranscriptSearchCurrent(nextPtr));
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
