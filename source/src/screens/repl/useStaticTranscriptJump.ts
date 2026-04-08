import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { RenderableMessage } from '../../types/message.js';
import { renderableSearchText } from '../../utils/transcriptSearch.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import { buildTranscriptSearchSnapshot, createTranscriptSearchCursor, getTranscriptSearchCurrent, getTranscriptSearchNextCursor, getTranscriptSearchPreviousCursor, getTranscriptSearchTotal, normalizeTranscriptSearchQuery, type TranscriptSearchSnapshot } from './transcriptSearchModel.js';

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
    snapshot: {
      query: '',
      matches: [],
      occurrenceCounts: [],
      occurrenceOffsets: [],
      totalOccurrences: 0,
    } as TranscriptSearchSnapshot,
    ptr: 0,
    occurrenceOrd: 0,
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
            snapshot: {
              query: '',
              matches: [],
              occurrenceCounts: [],
              occurrenceOffsets: [],
              totalOccurrences: 0,
            },
            ptr: 0,
            occurrenceOrd: 0,
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
            : stateRef.current.query === normalized && stateRef.current.ptr >= 0 && stateRef.current.ptr < snapshot.matches.length
              ? stateRef.current.ptr
              : 0;
        const occurrenceOrd =
          count === 0
            ? 0
            : stateRef.current.query === normalized
              ? createTranscriptSearchCursor(snapshot, ptr, stateRef.current.occurrenceOrd).occurrenceOrdinal
              : 0;

        stateRef.current = {
          query: normalized,
          snapshot,
          ptr,
          occurrenceOrd,
        };
        searchProgress.reportMatches(count, count > 0 ? getTranscriptSearchCurrent(snapshot, ptr, occurrenceOrd) : 0);
      },
      nextMatch: () => {
        const {
          snapshot,
          ptr,
          occurrenceOrd,
        } = stateRef.current;
        const count = getTranscriptSearchTotal(snapshot);
        if (count === 0) return;
        const next = getTranscriptSearchNextCursor(snapshot, {
          ptr,
          occurrenceOrdinal: occurrenceOrd,
        });
        stateRef.current.ptr = next.ptr;
        stateRef.current.occurrenceOrd = next.occurrenceOrdinal;
        searchProgress.reportMatches(count, getTranscriptSearchCurrent(snapshot, next.ptr, next.occurrenceOrdinal));
      },
      prevMatch: () => {
        const {
          snapshot,
          ptr,
          occurrenceOrd,
        } = stateRef.current;
        const count = getTranscriptSearchTotal(snapshot);
        if (count === 0) return;
        const next = getTranscriptSearchPreviousCursor(snapshot, {
          ptr,
          occurrenceOrdinal: occurrenceOrd,
        });
        stateRef.current.ptr = next.ptr;
        stateRef.current.occurrenceOrd = next.occurrenceOrdinal;
        searchProgress.reportMatches(count, getTranscriptSearchCurrent(snapshot, next.ptr, next.occurrenceOrdinal));
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
