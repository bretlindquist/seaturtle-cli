import { useCallback, useMemo, useState } from 'react';

export function useTranscriptSearchModel() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCount, setSearchCount] = useState(0);
  const [searchCurrent, setSearchCurrent] = useState(0);

  const onSearchMatchesChange = useCallback((count: number, current: number) => {
    setSearchCount(count);
    setSearchCurrent(current);
  }, []);

  const searchBadge = useMemo(() => searchQuery && searchCount > 0 ? {
    current: searchCurrent,
    count: searchCount
  } : undefined, [searchCount, searchCurrent, searchQuery]);

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchCount,
    setSearchCount,
    searchCurrent,
    setSearchCurrent,
    onSearchMatchesChange,
    searchBadge
  };
}
