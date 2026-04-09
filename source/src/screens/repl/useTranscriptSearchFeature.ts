import { useRef, type RefObject } from 'react';
import type { ScrollBoxHandle } from '../../ink/components/ScrollBox.js';
import { useSearchHighlight } from '../../ink/hooks/use-search-highlight.js';
import type { RenderableMessage } from '../../types/message.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import { useStaticTranscriptJump } from './useStaticTranscriptJump.js';
import { useTranscriptCleanupEffects } from './useTranscriptCleanupEffects.js';
import { useTranscriptSearchController } from './useTranscriptSearchController.js';
import { useTranscriptSearchDisplay } from './useTranscriptSearchDisplay.js';
import { useTranscriptSearchHotkeys } from './useTranscriptSearchHotkeys.js';
import { useTranscriptSearchTracker } from './useTranscriptSearchTracker.js';

type UseTranscriptSearchFeatureInput = {
  screen: 'prompt' | 'transcript';
  dumpMode: boolean;
  transcriptVirtualScrollActive: boolean;
  scrollRef: RefObject<ScrollBoxHandle | null>;
  transcriptMessages: RenderableMessage[];
  editorGenRef: RefObject<number>;
  editorTimerRef: RefObject<ReturnType<typeof setTimeout> | undefined>;
  setDumpMode: (value: boolean) => void;
  setEditorStatus: (status: string) => void;
};

export function useTranscriptSearchFeature({
  screen,
  dumpMode,
  transcriptVirtualScrollActive,
  scrollRef,
  transcriptMessages,
  editorGenRef,
  editorTimerRef,
  setDumpMode,
  setEditorStatus,
}: UseTranscriptSearchFeatureInput) {
  const jumpRef = useRef<JumpHandle | null>(null);
  const {
    searchOpen,
    openSearch,
    closeSearch,
    searchQuery,
    commitSearchQuery,
    searchCount,
    searchCurrent,
    hasNavigableMatches,
    searchProgress,
    clearSearchState,
    searchBadge,
  } = useTranscriptSearchTracker();
  const {
    setQuery: setTranscriptHighlightQuery,
    setRowRange: setTranscriptHighlightRowRange,
    scanElement,
  } = useSearchHighlight();

  useTranscriptSearchDisplay({
    screen,
    searchQuery,
    transcriptVirtualScrollActive,
    scrollRef,
    setTranscriptHighlightQuery,
    setTranscriptHighlightRowRange,
  });

  const {
    handleCloseSearchBar,
    handleCancelSearchBar,
  } = useTranscriptSearchController({
    screen,
    searchOpen,
    searchQuery,
    jumpRef,
    closeSearch,
    commitSearchQuery,
    clearSearchState,
  });

  useTranscriptSearchHotkeys({
    screen,
    searchOpen,
    dumpMode,
    hasNavigableMatches,
    jumpRef,
    openSearch,
  });

  useTranscriptCleanupEffects({
    inTranscript: screen === 'transcript',
    editorGenRef,
    editorTimerRef,
    clearSearchState,
    closeSearch,
    setDumpMode,
    setEditorStatus,
  });

  useStaticTranscriptJump({
    enabled: screen === 'transcript' && !transcriptVirtualScrollActive,
    messages: transcriptMessages,
    jumpRef,
    searchProgress,
  });

  return {
    jumpRef,
    scanElement,
    searchOpen,
    searchQuery,
    searchCount,
    searchCurrent,
    searchBadge,
    searchProgress,
    handleCloseSearchBar,
    handleCancelSearchBar,
  };
}
