import type { RenderableMessage } from '../../types/message.js';

export type TranscriptSearchSnapshot = {
  query: string;
  matches: number[];
  occurrenceCounts: number[];
  occurrenceOffsets: number[];
  totalOccurrences: number;
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
      occurrenceCounts: [],
      occurrenceOffsets: [],
      totalOccurrences: 0,
    };
  }

  const matches: number[] = [];
  const occurrenceCounts: number[] = [];
  const occurrenceOffsets: number[] = [];
  let totalOccurrences = 0;
  for (let i = 0; i < messages.length; i++) {
    const text = extractSearchText(messages[i]!);
    let count = 0;
    let pos = text.indexOf(query);
    while (pos >= 0) {
      count += 1;
      pos = text.indexOf(query, pos + query.length);
    }
    if (count > 0) {
      matches.push(i);
      occurrenceOffsets.push(totalOccurrences);
      occurrenceCounts.push(count);
      totalOccurrences += count;
    }
  }

  return {
    query,
    matches,
    occurrenceCounts,
    occurrenceOffsets,
    totalOccurrences,
  };
}

export function getTranscriptSearchTotal(snapshot: TranscriptSearchSnapshot): number {
  return snapshot.totalOccurrences;
}

export function getTranscriptSearchCurrent(
  snapshot: TranscriptSearchSnapshot,
  ptr: number,
  occurrenceOrdinal: number,
): number {
  if (snapshot.matches.length === 0) {
    return 0;
  }
  const offset = snapshot.occurrenceOffsets[ptr] ?? 0;
  return offset + occurrenceOrdinal + 1;
}

export function getTranscriptSearchOccurrenceCount(
  snapshot: TranscriptSearchSnapshot,
  ptr: number,
): number {
  return snapshot.occurrenceCounts[ptr] ?? 0;
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
