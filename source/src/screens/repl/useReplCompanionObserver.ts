import { useCallback } from 'react';

export function useReplCompanionObserver() {
  // Companion reactions are not fully rebuilt yet after the controller
  // extractions. Keep the query controller contract explicit and stable
  // instead of leaving an inline dangling callback in REPL.
  return useCallback(
    async (_messages: any[], _onReaction: (reaction: any) => void) => {},
    [],
  );
}
