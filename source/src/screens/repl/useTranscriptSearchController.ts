import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import type { TranscriptJumpHandle } from './transcriptJumpHandle.js';

type UseTranscriptSearchControllerInput = {
  screen: string
  searchOpen: boolean
  searchQuery: string
  jumpRef: RefObject<TranscriptJumpHandle | null>
  closeSearch: () => void
  commitSearchQuery: (query: string) => void
  clearSearchState: () => void
}

export function useTranscriptSearchController({
  screen: _screen,
  searchOpen,
  searchQuery,
  jumpRef,
  closeSearch,
  commitSearchQuery,
  clearSearchState,
}: UseTranscriptSearchControllerInput) {
  const transcriptCols = useTerminalSize().columns;
  const prevColsRef = useRef(transcriptCols);
  const prevSearchOpenRef = useRef(searchOpen);

  useEffect(() => {
    const wasOpen = prevSearchOpenRef.current;
    prevSearchOpenRef.current = searchOpen;

    if (!wasOpen || searchOpen || !searchQuery) {
      return;
    }

    const firstPass = setTimeout(() => {
      jumpRef.current?.refreshCurrentMatch();
    }, 0);
    const secondPass = setTimeout(() => {
      jumpRef.current?.refreshCurrentMatch();
    }, 16);

    return () => {
      clearTimeout(firstPass);
      clearTimeout(secondPass);
    };
  }, [jumpRef, searchOpen, searchQuery]);

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

  const handleCloseSearchBar = (q: string) => {
    jumpRef.current?.setSearchQuery(q);
    commitSearchQuery(q);
    closeSearch();
    if (!q) {
      clearSearchState();
      jumpRef.current?.setSearchQuery('');
      return;
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
