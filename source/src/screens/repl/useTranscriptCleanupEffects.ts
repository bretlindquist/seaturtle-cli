import { useEffect } from 'react';

type UseTranscriptCleanupEffectsInput = {
  inTranscript: boolean
  editorGenRef: React.RefObject<number>
  editorTimerRef: React.RefObject<ReturnType<typeof setTimeout> | undefined>
  clearSearchState: () => void
  setSearchOpen: (open: boolean) => void
  setDumpMode: (value: boolean) => void
  setEditorStatus: (status: string) => void
}

export function useTranscriptCleanupEffects({
  inTranscript,
  editorGenRef,
  editorTimerRef,
  clearSearchState,
  setSearchOpen,
  setDumpMode,
  setEditorStatus,
}: UseTranscriptCleanupEffectsInput): void {
  useEffect(() => {
    if (!inTranscript) {
      clearSearchState();
      setSearchOpen(false);
      editorGenRef.current++;
      clearTimeout(editorTimerRef.current);
      setDumpMode(false);
      setEditorStatus('');
    }
  }, [clearSearchState, editorGenRef, editorTimerRef, inTranscript, setDumpMode, setEditorStatus, setSearchOpen]);
}
