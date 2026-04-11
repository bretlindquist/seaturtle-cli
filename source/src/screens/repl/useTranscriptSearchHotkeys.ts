import { useInput } from '../../ink.js';
import type { RefObject } from 'react';
import type { TranscriptJumpHandle } from './transcriptJumpHandle.js';

type UseTranscriptSearchHotkeysInput = {
  screen: 'prompt' | 'transcript'
  searchOpen: boolean
  dumpMode: boolean
  hasNavigableMatches: boolean
  jumpRef: RefObject<TranscriptJumpHandle | null>
  openSearch: () => void
}

function matchesLiteralKey(
  input: string,
  key: { name?: string; sequence?: string; shift?: boolean },
  target: string,
): boolean {
  if (input === target) {
    return true
  }

  if (key.name === target || key.sequence === target) {
    return true
  }

  if (target.length === 1) {
    const lower = target.toLowerCase()
    const upper = target.toUpperCase()
    if (target === lower && key.name === lower && !key.shift) {
      return true
    }
    if (target === upper && key.name === lower && key.shift) {
      return true
    }
  }

  return false
}

export function useTranscriptSearchHotkeys({
  screen,
  searchOpen,
  dumpMode,
  hasNavigableMatches,
  jumpRef,
  openSearch,
}: UseTranscriptSearchHotkeysInput): void {
  useInput(
    (input, key, event) => {
      if (key.ctrl || key.meta) return;
      if (matchesLiteralKey(input, key, '/')) {
        jumpRef.current?.setAnchor();
        openSearch();
        event.stopImmediatePropagation();
        return;
      }

      if (hasNavigableMatches && matchesLiteralKey(input, key, 'n')) {
        const fn = jumpRef.current?.nextMatch;
        if (fn) {
          for (let i = 0; i < Math.max(input.length, 1); i++) fn();
        }
        event.stopImmediatePropagation();
        return;
      }

      if (hasNavigableMatches && matchesLiteralKey(input, key, 'N')) {
        const fn = jumpRef.current?.prevMatch;
        if (fn) {
          for (let i = 0; i < Math.max(input.length, 1); i++) fn();
        }
        event.stopImmediatePropagation();
      }
    },
    {
      isActive: screen === 'transcript' && !searchOpen && !dumpMode,
    },
  );
}
