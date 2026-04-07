import type { RenderableMessage } from '../../types/message.js';

export type TranscriptSearchSnapshot = {
  query: string;
  matches: number[];
};

export function normalizeTranscriptSearchQuery(query: string): string {
  return query.toLowerCase();
}

export function buildTranscriptSearchSnapshot(
  query: string,
  messages: readonly RenderableMessage[],
  extractSearchText: (msg: RenderableMessage) => string,
): TranscriptSearchSnapshot {
  if (!query) {
    return {
      query: '',
      matches: [],
    };
  }

  const matches: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (extractSearchText(messages[i]!).indexOf(query) >= 0) {
      matches.push(i);
    }
  }

  return {
    query,
    matches,
  };
}

export function getTranscriptSearchTotal(snapshot: TranscriptSearchSnapshot): number {
  return snapshot.matches.length;
}

export function getTranscriptSearchCurrent(ptr: number): number {
  return ptr + 1;
}

export function wrapTranscriptSearchPtr(
  ptr: number,
  delta: 1 | -1,
  total: number,
): number {
  if (total <= 0) {
    return 0;
  }
  return (ptr + delta + total) % total;
}
