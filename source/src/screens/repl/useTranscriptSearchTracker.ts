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
  const [searchCount, setSearchCount] = useState(0);
  const [searchCurrent, setSearchCurrent] = useState(0);

  const onSearchMatchesChange = useCallback((count: number, current: number) => {
    setSearchCount(count);
    setSearchCurrent(current);
  }, []);

  const clearSearchState = useCallback(() => {
    setSearchQuery('');
    setSearchCount(0);
    setSearchCurrent(0);
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

  const searchBadge = useMemo<TranscriptSearchBadge | undefined>(() => searchQuery && searchCount > 0 ? {
    current: searchCurrent,
    count: searchCount
  } : undefined, [searchCount, searchCurrent, searchQuery]);

  return {
    searchOpen,
    openSearch,
    closeSearch,
    searchQuery,
    commitSearchQuery,
    searchCount,
    searchCurrent,
    hasNavigableMatches: searchCount > 0,
    searchProgress,
    clearSearchState,
    searchBadge
  };
}
