import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { RenderableMessage } from '../../types/message.js';
import { renderableSearchText } from '../../utils/transcriptSearch.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import type { TranscriptJumpHandle } from './transcriptJumpHandle.js';
import {
  buildTranscriptSearchEngineState,
  createEmptyTranscriptSearchEngineState,
  hasTranscriptSearchEngineMatches,
  reportTranscriptSearchEngineBadge,
  setTranscriptSearchEngineCursorToNext,
  setTranscriptSearchEngineCursorToPrevious,
} from './transcriptSearchEngine.js';
import { normalizeTranscriptSearchQuery } from './transcriptSearchModel.js';

type UseStaticTranscriptJumpInput = {
  enabled: boolean;
  messages: RenderableMessage[];
  jumpRef: RefObject<TranscriptJumpHandle | null>;
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

  const handle = useMemo<TranscriptJumpHandle>(
    () => ({
      jumpToIndex: () => {},
      setAnchor: () => {},
      warmSearchIndex: async () => 0,
      disarmSearch: () => {},
      setSearchQuery: (query: string) => {
        const normalized = normalizeTranscriptSearchQuery(query);
        if (!normalized) {
          const engine = createEmptyTranscriptSearchEngineState()
          stateRef.current = {
            query: '',
            engine,
          };
          reportTranscriptSearchEngineBadge(searchProgress, engine);
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
        if (!hasTranscriptSearchEngineMatches(engine)) return;
        stateRef.current.engine = setTranscriptSearchEngineCursorToNext(engine);
        reportTranscriptSearchEngineBadge(searchProgress, stateRef.current.engine);
      },
      prevMatch: () => {
        const { engine } = stateRef.current;
        if (!hasTranscriptSearchEngineMatches(engine)) return;
        stateRef.current.engine = setTranscriptSearchEngineCursorToPrevious(engine);
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
