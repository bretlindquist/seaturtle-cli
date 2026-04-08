import { useEffect } from 'react';

type UseTranscriptCleanupEffectsInput = {
  inTranscript: boolean
  editorGenRef: React.RefObject<number>
  editorTimerRef: React.RefObject<ReturnType<typeof setTimeout> | undefined>
  clearSearchState: () => void
  closeSearch: () => void
  setDumpMode: (value: boolean) => void
  setEditorStatus: (status: string) => void
}

export function useTranscriptCleanupEffects({
  inTranscript,
  editorGenRef,
  editorTimerRef,
  clearSearchState,
  closeSearch,
  setDumpMode,
  setEditorStatus,
}: UseTranscriptCleanupEffectsInput): void {
  useEffect(() => {
    if (!inTranscript) {
      clearSearchState();
      closeSearch();
      editorGenRef.current++;
      clearTimeout(editorTimerRef.current);
      setDumpMode(false);
      setEditorStatus('');
    }
  }, [clearSearchState, closeSearch, editorGenRef, editorTimerRef, inTranscript, setDumpMode, setEditorStatus]);
}
