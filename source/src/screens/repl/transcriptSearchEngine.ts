import type { RenderableMessage } from '../../types/message.js';
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import {
  buildTranscriptSearchSnapshot,
  clampTranscriptSearchCursor,
  createTranscriptSearchCursor,
  createTranscriptSearchEdgeCursor,
  getTranscriptSearchNextCursor,
  getTranscriptSearchOccurrenceCount,
  getTranscriptSearchPreviousCursor,
  getTranscriptSearchCurrent,
  getTranscriptSearchTotal,
  normalizeTranscriptSearchQuery,
  type TranscriptSearchCursor,
  type TranscriptSearchSnapshot,
} from './transcriptSearchModel.js';

export type TranscriptSearchEngineState = {
  snapshot: TranscriptSearchSnapshot;
  cursor: TranscriptSearchCursor;
};

export type TranscriptSearchEngineBadge = {
  count: number;
  current: number;
};

export type TranscriptSearchEngineStep = {
  state: TranscriptSearchEngineState;
  previousMessageIndex: number | null;
  nextMessageIndex: number | null;
  stayedOnMessage: boolean;
};

export function createEmptyTranscriptSearchEngineState(): TranscriptSearchEngineState {
  return {
    snapshot: buildTranscriptSearchSnapshot('', [], () => ''),
    cursor: {
      ptr: 0,
      occurrenceOrdinal: 0,
    },
  };
}

export function buildTranscriptSearchEngineState(
  query: string,
  messages: readonly RenderableMessage[],
  extractSearchText: (msg: RenderableMessage) => string,
  previous?: {
    query: string;
    cursor: TranscriptSearchCursor;
  },
): TranscriptSearchEngineState {
  const normalized = normalizeTranscriptSearchQuery(query);
  const snapshot = buildTranscriptSearchSnapshot(normalized, messages, extractSearchText);
  if (!normalized || snapshot.matches.length === 0) {
    return {
      snapshot,
      cursor: {
        ptr: 0,
        occurrenceOrdinal: 0,
      },
    };
  }
  if (previous?.query === normalized) {
    return {
      snapshot,
      cursor: clampTranscriptSearchCursor(snapshot, previous.cursor),
    };
  }
  return {
    snapshot,
    cursor: createTranscriptSearchEdgeCursor(snapshot, 0, 'first'),
  };
}

export function getTranscriptSearchEngineTotal(state: TranscriptSearchEngineState): number {
  return getTranscriptSearchTotal(state.snapshot);
}

export function getTranscriptSearchEngineCurrent(state: TranscriptSearchEngineState): number {
  return getTranscriptSearchCurrent(
    state.snapshot,
    state.cursor.ptr,
    state.cursor.occurrenceOrdinal,
  );
}

export function getTranscriptSearchEngineBadge(
  state: TranscriptSearchEngineState,
): TranscriptSearchEngineBadge {
  const count = getTranscriptSearchEngineTotal(state);
  return {
    count,
    current: count > 0 ? getTranscriptSearchEngineCurrent(state) : 0,
  };
}

export function reportTranscriptSearchEngineBadge(
  sink: TranscriptSearchProgressSink | undefined,
  state: TranscriptSearchEngineState,
): void {
  if (!sink) {
    return;
  }

  const badge = getTranscriptSearchEngineBadge(state);
  sink.reportMatches(badge.count, badge.current);
}

export function hasTranscriptSearchEngineMatches(
  state: TranscriptSearchEngineState,
): boolean {
  return state.snapshot.matches.length > 0;
}

export function getTranscriptSearchEngineCurrentMessageIndex(
  state: TranscriptSearchEngineState,
): number | null {
  return state.snapshot.matches[state.cursor.ptr] ?? null;
}

export function getTranscriptSearchEngineCurrentMessageOccurrenceCount(
  state: TranscriptSearchEngineState,
): number {
  return getTranscriptSearchOccurrenceCount(state.snapshot, state.cursor.ptr);
}

export function getTranscriptSearchEngineCursor(
  state: TranscriptSearchEngineState,
): TranscriptSearchCursor {
  return state.cursor;
}

export function setTranscriptSearchEngineCursor(
  state: TranscriptSearchEngineState,
  cursor: TranscriptSearchCursor,
): TranscriptSearchEngineState {
  return {
    snapshot: state.snapshot,
    cursor: clampTranscriptSearchCursor(state.snapshot, cursor),
  };
}

export function setTranscriptSearchEngineCursorToEdge(
  state: TranscriptSearchEngineState,
  ptr: number,
  edge: 'first' | 'last',
): TranscriptSearchEngineState {
  return {
    snapshot: state.snapshot,
    cursor: createTranscriptSearchEdgeCursor(state.snapshot, ptr, edge),
  };
}

export function setTranscriptSearchEngineCursorToOccurrence(
  state: TranscriptSearchEngineState,
  ptr: number,
  occurrenceOrdinal: number,
): TranscriptSearchEngineState {
  return {
    snapshot: state.snapshot,
    cursor: createTranscriptSearchCursor(state.snapshot, ptr, occurrenceOrdinal),
  };
}

export function setTranscriptSearchEngineCursorToNext(
  state: TranscriptSearchEngineState,
): TranscriptSearchEngineState {
  return setTranscriptSearchEngineCursor(
    state,
    getTranscriptSearchNextCursor(state.snapshot, state.cursor),
  );
}

export function setTranscriptSearchEngineCursorToPrevious(
  state: TranscriptSearchEngineState,
): TranscriptSearchEngineState {
  return setTranscriptSearchEngineCursor(
    state,
    getTranscriptSearchPreviousCursor(state.snapshot, state.cursor),
  );
}

export function stepTranscriptSearchEngine(
  state: TranscriptSearchEngineState,
  delta: 1 | -1,
): TranscriptSearchEngineStep {
  const nextState =
    delta > 0
      ? setTranscriptSearchEngineCursorToNext(state)
      : setTranscriptSearchEngineCursorToPrevious(state);
  const previousMessageIndex =
    getTranscriptSearchEngineCurrentMessageIndex(state);
  const nextMessageIndex =
    getTranscriptSearchEngineCurrentMessageIndex(nextState);
  return {
    state: nextState,
    previousMessageIndex,
    nextMessageIndex,
    stayedOnMessage: previousMessageIndex === nextMessageIndex,
  };
}

export function getTranscriptSearchEngineEdgeCurrent(
  state: TranscriptSearchEngineState,
  ptr: number,
  edge: 'first' | 'last',
): number {
  const cursor = createTranscriptSearchEdgeCursor(state.snapshot, ptr, edge);
  return getTranscriptSearchCurrent(state.snapshot, cursor.ptr, cursor.occurrenceOrdinal);
}
