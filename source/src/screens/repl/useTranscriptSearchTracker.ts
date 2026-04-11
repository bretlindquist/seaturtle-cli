import { useCallback, useMemo, useState } from 'react';

export type TranscriptSearchProgressSink = {
  reportMatches: (count: number, current: number) => void;
};

export type TranscriptSearchBadge = {
  current: number;
  count: number;
};

export function useTranscriptSearchTracker() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProgressState, setSearchProgressState] = useState({
    count: 0,
    current: 0,
  });

  const onSearchMatchesChange = useCallback((count: number, current: number) => {
    setSearchProgressState({
      count,
      current,
    });
  }, []);

  const clearSearchState = useCallback(() => {
    setSearchQuery('');
    setSearchProgressState({
      count: 0,
      current: 0,
    });
  }, []);

  const commitSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const searchProgress = useMemo<TranscriptSearchProgressSink>(() => ({
    reportMatches: onSearchMatchesChange
  }), [onSearchMatchesChange]);

  const searchBadge = useMemo<TranscriptSearchBadge | undefined>(
    () =>
      searchQuery && searchProgressState.count > 0
        ? {
            current: searchProgressState.current,
            count: searchProgressState.count,
          }
        : undefined,
    [searchProgressState, searchQuery],
  );

  return {
    searchOpen,
    openSearch,
    closeSearch,
    searchQuery,
    commitSearchQuery,
    searchCount: searchProgressState.count,
    searchCurrent: searchProgressState.current,
    hasNavigableMatches: searchProgressState.count > 0,
    searchProgress,
    clearSearchState,
    searchBadge
  };
}
