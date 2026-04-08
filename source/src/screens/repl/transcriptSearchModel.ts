import type { RenderableMessage } from '../../types/message.js';

export type TranscriptSearchSnapshot = {
  query: string;
  matches: number[];
  occurrenceCounts: number[];
  occurrenceOffsets: number[];
  totalOccurrences: number;
};

export type TranscriptSearchCursor = {
  ptr: number;
  occurrenceOrdinal: number;
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

export function clampTranscriptSearchCursor(
  snapshot: TranscriptSearchSnapshot,
  cursor: TranscriptSearchCursor,
): TranscriptSearchCursor {
  if (snapshot.matches.length === 0) {
    return {
      ptr: 0,
      occurrenceOrdinal: 0,
    };
  }
  const ptr = Math.max(0, Math.min(cursor.ptr, snapshot.matches.length - 1));
  const occurrenceCount = getTranscriptSearchOccurrenceCount(snapshot, ptr);
  return {
    ptr,
    occurrenceOrdinal: Math.max(0, Math.min(cursor.occurrenceOrdinal, Math.max(0, occurrenceCount - 1))),
  };
}

export function createTranscriptSearchCursor(
  snapshot: TranscriptSearchSnapshot,
  ptr: number,
  occurrenceOrdinal: number,
): TranscriptSearchCursor {
  return clampTranscriptSearchCursor(snapshot, {
    ptr,
    occurrenceOrdinal,
  });
}

export function createTranscriptSearchEdgeCursor(
  snapshot: TranscriptSearchSnapshot,
  ptr: number,
  edge: 'first' | 'last',
): TranscriptSearchCursor {
  const occurrenceCount = getTranscriptSearchOccurrenceCount(snapshot, ptr);
  return createTranscriptSearchCursor(
    snapshot,
    ptr,
    edge === 'last' ? Math.max(0, occurrenceCount - 1) : 0,
  );
}

export function getTranscriptSearchNextCursor(
  snapshot: TranscriptSearchSnapshot,
  cursor: TranscriptSearchCursor,
): TranscriptSearchCursor {
  if (snapshot.matches.length === 0) {
    return {
      ptr: 0,
      occurrenceOrdinal: 0,
    };
  }
  const current = clampTranscriptSearchCursor(snapshot, cursor);
  const occurrenceCount = getTranscriptSearchOccurrenceCount(snapshot, current.ptr);
  if (current.occurrenceOrdinal + 1 < occurrenceCount) {
    return {
      ptr: current.ptr,
      occurrenceOrdinal: current.occurrenceOrdinal + 1,
    };
  }
  return createTranscriptSearchEdgeCursor(
    snapshot,
    wrapTranscriptSearchPtr(current.ptr, 1, snapshot.matches.length),
    'first',
  );
}

export function getTranscriptSearchPreviousCursor(
  snapshot: TranscriptSearchSnapshot,
  cursor: TranscriptSearchCursor,
): TranscriptSearchCursor {
  if (snapshot.matches.length === 0) {
    return {
      ptr: 0,
      occurrenceOrdinal: 0,
    };
  }
  const current = clampTranscriptSearchCursor(snapshot, cursor);
  if (current.occurrenceOrdinal > 0) {
    return {
      ptr: current.ptr,
      occurrenceOrdinal: current.occurrenceOrdinal - 1,
    };
  }
  return createTranscriptSearchEdgeCursor(
    snapshot,
    wrapTranscriptSearchPtr(current.ptr, -1, snapshot.matches.length),
    'last',
  );
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
