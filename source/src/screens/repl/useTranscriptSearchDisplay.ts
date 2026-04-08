import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { ScrollBoxHandle } from '../../ink/components/ScrollBox.js';

type UseTranscriptSearchDisplayInput = {
  screen: string;
  searchQuery: string;
  transcriptVirtualScrollActive: boolean;
  scrollRef: RefObject<ScrollBoxHandle | null>;
  setTranscriptHighlightQuery: (query: string) => void;
  setTranscriptHighlightRowRange: (
    range: { start: number; end: number } | null,
  ) => void;
};

export function useTranscriptSearchDisplay({
  screen,
  searchQuery,
  transcriptVirtualScrollActive,
  scrollRef,
  setTranscriptHighlightQuery,
  setTranscriptHighlightRowRange,
}: UseTranscriptSearchDisplayInput): void {
  useEffect(() => {
    setTranscriptHighlightQuery(screen === 'transcript' ? searchQuery : '');
    return () => {
      setTranscriptHighlightQuery('');
    };
  }, [screen, searchQuery, setTranscriptHighlightQuery]);

  useEffect(() => {
    if (screen !== 'transcript' || !transcriptVirtualScrollActive || !searchQuery) {
      setTranscriptHighlightRowRange(null);
      return;
    }
    const handle = scrollRef.current;
    if (!handle) {
      setTranscriptHighlightRowRange(null);
      return;
    }
    const top = handle.getViewportTop();
    const bottom = top + handle.getViewportHeight() - 1;
    setTranscriptHighlightRowRange({
      start: top,
      end: bottom,
    });
    return () => {
      setTranscriptHighlightRowRange(null);
    };
  }, [
    screen,
    searchQuery,
    scrollRef,
    setTranscriptHighlightRowRange,
    transcriptVirtualScrollActive,
  ]);
}
