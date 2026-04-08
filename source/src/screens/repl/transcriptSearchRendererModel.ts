import { buildTranscriptSearchEngineState } from './transcriptSearchEngine.js';
import type { RenderableMessage } from '../../types/message.js';
import {
  getTranscriptSearchEngineCurrent,
  getTranscriptSearchEngineCurrentMessageOccurrenceCount,
  getTranscriptSearchEngineEdgeCurrent,
  getTranscriptSearchEngineTotal,
  createEmptyTranscriptSearchEngineState,
} from './transcriptSearchEngine.js';
import type { TranscriptSearchSnapshot } from './transcriptSearchModel.js';

export type SearchNavigationState = {
  snapshot: TranscriptSearchSnapshot;
  ptr: number;
  screenOrd: number;
};

export function createEmptySearchNavigationState(): SearchNavigationState {
  return {
    snapshot: createEmptyTranscriptSearchEngineState().snapshot,
    ptr: 0,
    screenOrd: 0,
  };
}

export function getSearchNavigationTotal(state: SearchNavigationState): number {
  return getTranscriptSearchEngineTotal({
    snapshot: state.snapshot,
    cursor: {
      ptr: state.ptr,
      occurrenceOrdinal: state.screenOrd,
    },
  });
}

export function getSearchNavigationCurrent(
  state: SearchNavigationState,
  matchOrdinal: number,
): number {
  return getTranscriptSearchEngineCurrent({
    snapshot: state.snapshot,
    cursor: {
      ptr: state.ptr,
      occurrenceOrdinal: matchOrdinal,
    },
  });
}

export function getSearchNavigationPlaceholderCurrent(
  state: SearchNavigationState,
  ptr: number,
  delta: 1 | -1,
): number {
  return getTranscriptSearchEngineEdgeCurrent(
    {
      snapshot: state.snapshot,
      cursor: {
        ptr: state.ptr,
        occurrenceOrdinal: state.screenOrd,
      },
    },
    ptr,
    delta < 0 ? 'last' : 'first',
  );
}

export function getSearchNavigationCurrentMessageOccurrenceCount(
  state: SearchNavigationState,
): number {
  return getTranscriptSearchEngineCurrentMessageOccurrenceCount({
    snapshot: state.snapshot,
    cursor: {
      ptr: state.ptr,
      occurrenceOrdinal: state.screenOrd,
    },
  });
}

export function findNearestSearchMatchPtr(
  matches: number[],
  offsets: Float64Array,
  start: number,
  getItemTop: (i: number) => number,
  currentTop: number,
): number {
  if (matches.length === 0) {
    return 0;
  }

  const firstTop = getItemTop(start);
  const origin = firstTop >= 0 ? firstTop - offsets[start]! : 0;
  let ptr = 0;
  let best = Infinity;
  for (let k = 0; k < matches.length; k++) {
    const distance = Math.abs(origin + offsets[matches[k]!]! - currentTop);
    if (distance <= best) {
      best = distance;
      ptr = k;
    }
  }
  return ptr;
}

type BuildSearchNavigationStateForQueryInput = {
  query: string;
  messages: readonly RenderableMessage[];
  extractSearchText: (msg: RenderableMessage) => string;
  previous: {
    query: string;
    ptr: number;
    screenOrd: number;
  };
  currentTop: number;
  offsets: Float64Array;
  start: number;
  getItemTop: (i: number) => number;
};

export function buildSearchNavigationStateForQuery({
  query,
  messages,
  extractSearchText,
  previous,
  currentTop,
  offsets,
  start,
  getItemTop,
}: BuildSearchNavigationStateForQueryInput): SearchNavigationState {
  const engine = buildTranscriptSearchEngineState(query, messages, extractSearchText, {
    query: previous.query,
    cursor: {
      ptr: previous.ptr,
      occurrenceOrdinal: previous.screenOrd,
    },
  });
  if (engine.snapshot.matches.length === 0) {
    return {
      snapshot: engine.snapshot,
      ptr: engine.cursor.ptr,
      screenOrd: engine.cursor.occurrenceOrdinal,
    };
  }
  const ptr = findNearestSearchMatchPtr(
    engine.snapshot.matches,
    offsets,
    start,
    getItemTop,
    currentTop,
  );
  return {
    snapshot: engine.snapshot,
    ptr,
    screenOrd: engine.cursor.occurrenceOrdinal,
  };
}
