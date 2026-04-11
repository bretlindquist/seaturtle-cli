import type { RenderableMessage } from '../../types/message.js'
import {
  buildTranscriptSearchEngineState,
  createEmptyTranscriptSearchEngineState,
  hasTranscriptSearchEngineMatches,
  reportTranscriptSearchEngineBadge,
  stepTranscriptSearchEngine,
  type TranscriptSearchEngineState,
} from './transcriptSearchEngine.js'
import type { TranscriptJumpHandle } from './transcriptJumpHandle.js'
import type { TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js'

export type StaticTranscriptJumpState = {
  query: string
  engine: TranscriptSearchEngineState
}

export function createEmptyStaticTranscriptJumpState(): StaticTranscriptJumpState {
  return {
    query: '',
    engine: createEmptyTranscriptSearchEngineState(),
  }
}

export function buildStaticTranscriptJumpHandle(params: {
  stateRef: { current: StaticTranscriptJumpState }
  messagesRef: { current: RenderableMessage[] }
  searchProgress: TranscriptSearchProgressSink
  normalizeQuery: (query: string) => string
  extractSearchText: (msg: RenderableMessage) => string
}): TranscriptJumpHandle {
  return {
    jumpToIndex: () => {},
    setAnchor: () => {},
    warmSearchIndex: async () => 0,
    disarmSearch: () => {},
    setSearchQuery: (query: string) => {
      const normalized = params.normalizeQuery(query)
      if (!normalized) {
        const engine = createEmptyTranscriptSearchEngineState()
        params.stateRef.current = {
          query: '',
          engine,
        }
        reportTranscriptSearchEngineBadge(params.searchProgress, engine)
        return
      }

      const engine = buildTranscriptSearchEngineState(
        normalized,
        params.messagesRef.current,
        params.extractSearchText,
        params.stateRef.current.query
          ? {
              query: params.stateRef.current.query,
              cursor: params.stateRef.current.engine.cursor,
            }
          : undefined,
      )

      params.stateRef.current = {
        query: normalized,
        engine,
      }
      reportTranscriptSearchEngineBadge(params.searchProgress, engine)
    },
    nextMatch: () => {
      const { engine } = params.stateRef.current
      if (!hasTranscriptSearchEngineMatches(engine)) return
      params.stateRef.current.engine = stepTranscriptSearchEngine(engine, 1).state
      reportTranscriptSearchEngineBadge(
        params.searchProgress,
        params.stateRef.current.engine,
      )
    },
    prevMatch: () => {
      const { engine } = params.stateRef.current
      if (!hasTranscriptSearchEngineMatches(engine)) return
      params.stateRef.current.engine = stepTranscriptSearchEngine(engine, -1).state
      reportTranscriptSearchEngineBadge(
        params.searchProgress,
        params.stateRef.current.engine,
      )
    },
    refreshCurrentMatch: () => {},
  }
}
