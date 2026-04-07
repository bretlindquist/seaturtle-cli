import { useEffect } from 'react';

type UseTranscriptCleanupEffectsInput = {
  inTranscript: boolean
  searchQuery: string
  editorGenRef: React.RefObject<number>
  editorTimerRef: React.RefObject<ReturnType<typeof setTimeout> | undefined>
  setSearchQuery: (query: string) => void
  setSearchCount: (count: number) => void
  setSearchCurrent: (current: number) => void
  setSearchOpen: (open: boolean) => void
  setDumpMode: (value: boolean) => void
  setEditorStatus: (status: string) => void
  setHighlight: (highlight: string) => void
  setPositions: (positions: null) => void
}

export function useTranscriptCleanupEffects({
  inTranscript,
  editorGenRef,
  editorTimerRef,
  setSearchQuery,
  setSearchCount,
  setSearchCurrent,
  setSearchOpen,
  setDumpMode,
  setEditorStatus,
  setHighlight,
  setPositions,
}: UseTranscriptCleanupEffectsInput): void {
  useEffect(() => {
    if (!inTranscript) {
      setSearchQuery('');
      setSearchCount(0);
      setSearchCurrent(0);
      setSearchOpen(false);
      editorGenRef.current++;
      clearTimeout(editorTimerRef.current);
      setDumpMode(false);
      setEditorStatus('');
    }
  }, [editorGenRef, editorTimerRef, inTranscript, setDumpMode, setEditorStatus, setSearchCount, setSearchCurrent, setSearchOpen, setSearchQuery]);

  useEffect(() => {
    setHighlight('');
    if (!inTranscript) setPositions(null);
  }, [inTranscript, setHighlight, setPositions]);
}
