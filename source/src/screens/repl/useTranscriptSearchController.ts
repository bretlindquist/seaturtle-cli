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
  closeSearch: () => void
  commitSearchQuery: (query: string) => void
  clearSearchState: () => void
}

export function useTranscriptSearchController({
  screen,
  searchOpen,
  searchQuery,
  searchCount,
  jumpRef,
  closeSearch,
  commitSearchQuery,
  clearSearchState,
}: UseTranscriptSearchControllerInput) {
  const transcriptCols = useTerminalSize().columns;
  const prevColsRef = useRef(transcriptCols);
  const prevSearchOpenRef = useRef(searchOpen);

  useEffect(() => {
    if (prevColsRef.current !== transcriptCols) {
      prevColsRef.current = transcriptCols;
      if (searchQuery || searchOpen) {
        closeSearch();
        clearSearchState();
        jumpRef.current?.disarmSearch();
      }
    }
  }, [clearSearchState, closeSearch, jumpRef, searchOpen, searchQuery, transcriptCols]);

  useEffect(() => {
    const wasOpen = prevSearchOpenRef.current;
    prevSearchOpenRef.current = searchOpen;
    if (!wasOpen || searchOpen || screen !== 'transcript' || !searchQuery) {
      return;
    }
    jumpRef.current?.refreshCurrentMatch?.();
  }, [jumpRef, screen, searchOpen, searchQuery]);

  const handleCloseSearchBar = (q: string) => {
    const committedQuery = searchCount > 0 ? q : '';
    commitSearchQuery(committedQuery);
    closeSearch();
    if (!q) {
      clearSearchState();
      jumpRef.current?.setSearchQuery('');
    }
  };

  const handleCancelSearchBar = () => {
    closeSearch();
    jumpRef.current?.setSearchQuery('');
    jumpRef.current?.setSearchQuery(searchQuery);
  };

  return {
    handleCloseSearchBar,
    handleCancelSearchBar,
  };
}
