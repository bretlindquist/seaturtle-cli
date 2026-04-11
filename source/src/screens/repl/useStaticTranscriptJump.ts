import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { RenderableMessage } from '../../types/message.js';
import { renderableSearchText } from '../../utils/transcriptSearch.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import {
  buildTranscriptSearchEngineState,
  createEmptyTranscriptSearchEngineState,
  reportTranscriptSearchEngineBadge,
  setTranscriptSearchEngineCursor,
} from './transcriptSearchEngine.js';
import {
  getTranscriptSearchNextCursor,
  getTranscriptSearchPreviousCursor,
  normalizeTranscriptSearchQuery,
} from './transcriptSearchModel.js';

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
    engine: createEmptyTranscriptSearchEngineState(),
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
            engine: createEmptyTranscriptSearchEngineState(),
          };
          searchProgress.reportMatches(0, 0);
          return;
        }

        const engine = buildTranscriptSearchEngineState(
          normalized,
          messagesRef.current,
          renderableSearchText,
          stateRef.current.query
            ? {
                query: stateRef.current.query,
                cursor: stateRef.current.engine.cursor,
              }
            : undefined,
        );

        stateRef.current = {
          query: normalized,
          engine,
        };
        reportTranscriptSearchEngineBadge(searchProgress, engine);
      },
      nextMatch: () => {
        const { engine } = stateRef.current;
        if (engine.snapshot.matches.length === 0) return;
        const next = getTranscriptSearchNextCursor(engine.snapshot, engine.cursor);
        stateRef.current.engine = setTranscriptSearchEngineCursor(engine, next);
        reportTranscriptSearchEngineBadge(searchProgress, stateRef.current.engine);
      },
      prevMatch: () => {
        const { engine } = stateRef.current;
        if (engine.snapshot.matches.length === 0) return;
        const next = getTranscriptSearchPreviousCursor(engine.snapshot, engine.cursor);
        stateRef.current.engine = setTranscriptSearchEngineCursor(engine, next);
        reportTranscriptSearchEngineBadge(searchProgress, stateRef.current.engine);
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
