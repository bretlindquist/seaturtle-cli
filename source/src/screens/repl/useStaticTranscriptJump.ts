import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { RenderableMessage } from '../../types/message.js';
import { renderableSearchText } from '../../utils/transcriptSearch.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import type { TranscriptJumpHandle } from './transcriptJumpHandle.js';
import { normalizeTranscriptSearchQuery } from './transcriptSearchModel.js';
import {
  buildStaticTranscriptJumpHandle,
  createEmptyStaticTranscriptJumpState,
} from './transcriptJumpHandleCore.js';

type UseStaticTranscriptJumpInput = {
  enabled: boolean;
  messages: RenderableMessage[];
  jumpRef: RefObject<TranscriptJumpHandle | null>;
  searchProgress: TranscriptSearchProgressSink;
};

export function useStaticTranscriptJump({
  enabled,
  messages,
  jumpRef,
  searchProgress,
}: UseStaticTranscriptJumpInput): void {
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const stateRef = useRef({
    ...createEmptyStaticTranscriptJumpState(),
  });

  const handle = useMemo<TranscriptJumpHandle>(
    () =>
      buildStaticTranscriptJumpHandle({
        stateRef,
        messagesRef,
        searchProgress,
        normalizeQuery: normalizeTranscriptSearchQuery,
        extractSearchText: renderableSearchText,
      }),
    [searchProgress],
  );

  useEffect(() => {
    if (!enabled) return;
    jumpRef.current = handle;
    return () => {
      if (jumpRef.current === handle) {
        jumpRef.current = null;
      }
    };
  }, [enabled, handle, jumpRef]);
}
