import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';

type UseTranscriptSearchControllerInput = {
  screen: string
  searchOpen: boolean
  searchQuery: string
  searchCount: number
  jumpRef: RefObject<JumpHandle | null>
  setSearchOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  clearSearchState: () => void
}

export function useTranscriptSearchController({
  screen,
  searchOpen,
  searchQuery,
  searchCount,
  jumpRef,
  setSearchOpen,
  setSearchQuery,
  clearSearchState,
}: UseTranscriptSearchControllerInput) {
  const transcriptCols = useTerminalSize().columns;
  const prevColsRef = useRef(transcriptCols);
  const prevSearchOpenRef = useRef(searchOpen);

  useEffect(() => {
    if (prevColsRef.current !== transcriptCols) {
      prevColsRef.current = transcriptCols;
      if (searchQuery || searchOpen) {
        setSearchOpen(false);
        clearSearchState();
        jumpRef.current?.disarmSearch();
      }
    }
  }, [clearSearchState, jumpRef, searchOpen, searchQuery, setSearchOpen, transcriptCols]);

  useEffect(() => {
    const wasOpen = prevSearchOpenRef.current;
    prevSearchOpenRef.current = searchOpen;
    if (!wasOpen || searchOpen || screen !== 'transcript' || !searchQuery) {
      return;
    }
    jumpRef.current?.refreshCurrentMatch?.();
  }, [jumpRef, screen, searchOpen, searchQuery]);

  const handleSearchClose = (q: string) => {
    const committedQuery = searchCount > 0 ? q : '';
    setSearchQuery(committedQuery);
    setSearchOpen(false);
    if (!q) {
      clearSearchState();
      jumpRef.current?.setSearchQuery('');
    }
  };

  const handleSearchCancel = () => {
    setSearchOpen(false);
    jumpRef.current?.setSearchQuery('');
    jumpRef.current?.setSearchQuery(searchQuery);
  };
  return {
    handleSearchClose,
    handleSearchCancel
  };
}
