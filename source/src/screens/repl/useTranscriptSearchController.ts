import type { RefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';

type UseTranscriptSearchControllerInput = {
  screen: string
  searchOpen: boolean
  searchQuery: string
  searchCount: number
  searchCurrent: number
  jumpRef: RefObject<JumpHandle | null>
  setSearchOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setSearchCount: (count: number) => void
  setSearchCurrent: (current: number) => void
  setHighlight: (query: string) => void
}

export function useTranscriptSearchController({
  screen,
  searchOpen,
  searchQuery,
  searchCount,
  searchCurrent,
  jumpRef,
  setSearchOpen,
  setSearchQuery,
  setSearchCount,
  setSearchCurrent,
  setHighlight
}: UseTranscriptSearchControllerInput) {
  const transcriptCols = useTerminalSize().columns;
  const prevColsRef = useRef(transcriptCols);
  const prevSearchOpenRef = useRef(searchOpen);

  useEffect(() => {
    if (prevColsRef.current !== transcriptCols) {
      prevColsRef.current = transcriptCols;
      if (searchQuery || searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchCount(0);
        setSearchCurrent(0);
        jumpRef.current?.disarmSearch();
        setHighlight('');
      }
    }
  }, [jumpRef, searchOpen, searchQuery, setHighlight, setSearchCount, setSearchCurrent, setSearchOpen, setSearchQuery, transcriptCols]);

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
    setHighlight(committedQuery);
    if (!q) {
      setSearchCount(0);
      setSearchCurrent(0);
      jumpRef.current?.setSearchQuery('');
    }
  };

  const handleSearchCancel = () => {
    setSearchOpen(false);
    jumpRef.current?.setSearchQuery('');
    jumpRef.current?.setSearchQuery(searchQuery);
    setHighlight(searchQuery);
  };

  const searchBadge = useMemo(() => searchQuery && searchCount > 0 ? {
    current: searchCurrent,
    count: searchCount
  } : undefined, [searchCount, searchCurrent, searchQuery]);

  return {
    searchBadge,
    handleSearchClose,
    handleSearchCancel
  };
}
