import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { RenderableMessage } from '../../types/message.js';
import { renderableSearchText } from '../../utils/transcriptSearch.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import { buildTranscriptSearchSnapshot, getTranscriptSearchCurrent, getTranscriptSearchOccurrenceCount, getTranscriptSearchTotal, normalizeTranscriptSearchQuery, wrapTranscriptSearchPtr, type TranscriptSearchSnapshot } from './transcriptSearchModel.js';

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
        const occurrenceCount = getTranscriptSearchOccurrenceCount(snapshot, ptr);
        const occurrenceOrd =
          count === 0
            ? 0
            : stateRef.current.query === normalized && stateRef.current.occurrenceOrd >= 0 && stateRef.current.occurrenceOrd < occurrenceCount
              ? stateRef.current.occurrenceOrd
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
        const occurrenceCount = getTranscriptSearchOccurrenceCount(snapshot, ptr);
        if (occurrenceOrd + 1 < occurrenceCount) {
          const nextOccurrenceOrd = occurrenceOrd + 1;
          stateRef.current.occurrenceOrd = nextOccurrenceOrd;
          searchProgress.reportMatches(count, getTranscriptSearchCurrent(snapshot, ptr, nextOccurrenceOrd));
          return;
        }
        const nextPtr = wrapTranscriptSearchPtr(ptr, 1, snapshot.matches.length);
        stateRef.current.ptr = nextPtr;
        stateRef.current.occurrenceOrd = 0;
        searchProgress.reportMatches(count, getTranscriptSearchCurrent(snapshot, nextPtr, 0));
      },
      prevMatch: () => {
        const {
          snapshot,
          ptr,
          occurrenceOrd,
        } = stateRef.current;
        const count = getTranscriptSearchTotal(snapshot);
        if (count === 0) return;
        if (occurrenceOrd > 0) {
          const nextOccurrenceOrd = occurrenceOrd - 1;
          stateRef.current.occurrenceOrd = nextOccurrenceOrd;
          searchProgress.reportMatches(count, getTranscriptSearchCurrent(snapshot, ptr, nextOccurrenceOrd));
          return;
        }
        const nextPtr = wrapTranscriptSearchPtr(ptr, -1, snapshot.matches.length);
        const nextOccurrenceOrd = Math.max(0, getTranscriptSearchOccurrenceCount(snapshot, nextPtr) - 1);
        stateRef.current.ptr = nextPtr;
        stateRef.current.occurrenceOrd = nextOccurrenceOrd;
        searchProgress.reportMatches(count, getTranscriptSearchCurrent(snapshot, nextPtr, nextOccurrenceOrd));
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
