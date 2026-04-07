import { useInput } from '../../ink.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import type { RefObject } from 'react';

type UseTranscriptSearchHotkeysInput = {
  screen: 'prompt' | 'transcript'
  virtualScrollActive: boolean
  searchOpen: boolean
  dumpMode: boolean
  searchCount: number
  jumpRef: RefObject<JumpHandle | null>
  setSearchOpen: (open: boolean) => void
}

export function useTranscriptSearchHotkeys({
  screen,
  virtualScrollActive,
  searchOpen,
  dumpMode,
  searchCount,
  jumpRef,
  setSearchOpen,
}: UseTranscriptSearchHotkeysInput): void {
  useInput(
    (input, key, event) => {
      if (key.ctrl || key.meta) return;
      if (input === '/') {
        jumpRef.current?.setAnchor();
        setSearchOpen(true);
        event.stopImmediatePropagation();
        return;
      }

      const c = input[0];
      if (
        (c === 'n' || c === 'N') &&
        input === c.repeat(input.length) &&
        searchCount > 0
      ) {
        const fn = c === 'n' ? jumpRef.current?.nextMatch : jumpRef.current?.prevMatch;
        if (fn) {
          for (let i = 0; i < input.length; i++) fn();
        }
        event.stopImmediatePropagation();
      }
    },
    {
      isActive:
        screen === 'transcript' &&
        virtualScrollActive &&
        !searchOpen &&
        !dumpMode,
    },
  );
}
