import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { DOMElement } from '../ink/dom.js'
import { nodeCache } from '../ink/node-cache.js'
import type { MatchPosition } from '../ink/render-to-screen.js'
import type { ScrollBoxHandle } from '../ink/components/ScrollBox.js'
import type { RenderableMessage } from '../types/message.js'
import type { TranscriptSearchProgressSink } from '../screens/repl/useTranscriptSearchTracker.js'
import type { TranscriptJumpHandle } from '../screens/repl/transcriptJumpHandle.js'
import {
  buildTranscriptSearchEngineState,
  createEmptyTranscriptSearchEngineState,
  getTranscriptSearchEngineCurrentMessageIndex,
  getTranscriptSearchEngineCurrentMessageOccurrenceCount,
  getTranscriptSearchEngineBadge,
  hasTranscriptSearchEngineMatches,
  reportTranscriptSearchEngineBadge,
  setTranscriptSearchEngineCursorToOccurrence,
  stepTranscriptSearchEngine,
  type TranscriptSearchEngineState,
} from '../screens/repl/transcriptSearchEngine.js'
import { logForDebugging } from '../utils/debug.js'
import { sleep } from '../utils/sleep.js'

const HEADROOM = 3

export type ActiveTranscriptResult = {
  msgIdx: number
  ordinal: number
}

export type VirtualTranscriptSearchRuntime = {
  getItemElement: (index: number) => DOMElement | null
  getItemTop: (index: number) => number
  messages: RenderableMessage[]
  scrollToIndex: (index: number) => void
}

export type VirtualTranscriptSearchHandle = {
  setSearchQuery: (query: string) => void
  nextMatch: () => void
  prevMatch: () => void
  refreshCurrentMatch: () => void
  setSearchAnchor: () => void
  disarmSearch: () => void
  warmSearchIndex: () => Promise<number>
}

export function useVirtualTranscriptSearch({
  jumpRef,
  scrollRef,
  jumpStateRef,
  extractSearchText,
  searchProgress,
  scanElement,
}: {
  jumpRef?: RefObject<TranscriptJumpHandle | null>
  scrollRef: RefObject<ScrollBoxHandle | null>
  jumpStateRef: RefObject<VirtualTranscriptSearchRuntime>
  extractSearchText: (msg: RenderableMessage) => string
  searchProgress?: TranscriptSearchProgressSink
  scanElement?: (el: DOMElement) => MatchPosition[]
}): {
  activeResult: ActiveTranscriptResult | null
  matchedMessageIdxs: Set<number>
} {
  const scanRequestRef = useRef<{
    idx: number
    wantLast: boolean
    tries: number
  } | null>(null)
  const elementPositions = useRef<{
    msgIdx: number
    positions: MatchPosition[]
  }>({
    msgIdx: -1,
    positions: [],
  })
  const startPtrRef = useRef(-1)
  const phantomBurstRef = useRef(0)
  const pendingStepRef = useRef<1 | -1 | 0>(0)
  const stepRef = useRef<(d: 1 | -1) => void>(() => {})
  const highlightRef = useRef<(ord: number) => void>(() => {})
  const searchState = useRef<TranscriptSearchEngineState>(
    createEmptyTranscriptSearchEngineState(),
  )
  const searchAnchor = useRef(-1)
  const indexWarmed = useRef(false)
  const [activeResult, setActiveResult] = useState<ActiveTranscriptResult | null>(
    null,
  )
  const [matchedMessageIdxs, setMatchedMessageIdxs] = useState<Set<number>>(
    () => new Set(),
  )
  const [seekGen, setSeekGen] = useState(0)

  const clearActiveResult = useCallback(() => {
    setActiveResult(null)
  }, [])

  const setActiveResultMatch = useCallback((msgIdx: number, ordinal: number) => {
    setActiveResult({
      msgIdx,
      ordinal,
    })
  }, [])

  const resetSearchViewportState = useCallback(() => {
    clearActiveResult()
    elementPositions.current = {
      msgIdx: -1,
      positions: [],
    }
  }, [clearActiveResult])

  const setSearchEngineState = useCallback((next: TranscriptSearchEngineState) => {
    searchState.current = next
    setMatchedMessageIdxs(new Set(next.snapshot.matches))
  }, [])

  const bumpSeek = useCallback(() => setSeekGen(g => g + 1), [])

  const drainPendingStep = useCallback(() => {
    const pending = pendingStepRef.current
    pendingStepRef.current = 0
    if (pending) {
      stepRef.current(pending)
      return true
    }
    return false
  }, [])

  const beginSeek = useCallback((idx: number, wantLast: boolean, tries: number) => {
    scanRequestRef.current = {
      idx,
      wantLast,
      tries,
    }
  }, [])

  const retryUnmountedSeek = useCallback(
    (
      idx: number,
      wantLast: boolean,
      tries: number,
      scrollToIndex: (index: number) => void,
    ) => {
      if (tries > 1) {
        scanRequestRef.current = null
        logForDebugging(`seek(i=${idx}): no mount after scrollToIndex, skip`)
        drainPendingStep()
        return true
      }
      beginSeek(idx, wantLast, tries + 1)
      scrollToIndex(idx)
      bumpSeek()
      return true
    },
    [beginSeek, bumpSeek, drainPendingStep],
  )

  const finishSeekAtMountedElement = useCallback(
    (idx: number, wantLast: boolean, tries: number, el: DOMElement) => {
      const s = scrollRef.current
      if (!s) return false
      const { getItemTop } = jumpStateRef.current
      scanRequestRef.current = null
      const targetTop = Math.max(0, getItemTop(idx) - HEADROOM)
      const beforeTop = s.getScrollTop()
      if (beforeTop !== targetTop) {
        s.scrollTo(targetTop)
        if (tries < 3) {
          beginSeek(idx, wantLast, tries + 1)
          bumpSeek()
          return true
        }
      }
      const positions = scanElement?.(el) ?? []
      elementPositions.current = {
        msgIdx: idx,
        positions,
      }
      logForDebugging(`seek(i=${idx} t=${tries}): ${positions.length} positions`)
      if (positions.length === 0) {
        clearActiveResult()
        if (tries < 3) {
          beginSeek(idx, wantLast, tries + 1)
          bumpSeek()
          logForDebugging(`seek(i=${idx} t=${tries}): retrying empty scan`)
          return true
        }
        if (++phantomBurstRef.current > 20) {
          phantomBurstRef.current = 0
          return true
        }
        drainPendingStep()
        return true
      }
      phantomBurstRef.current = 0
      const expectedOccurrences = Math.max(
        1,
        getTranscriptSearchEngineCurrentMessageOccurrenceCount(searchState.current),
      )
      const usablePositions = Math.min(positions.length, expectedOccurrences)
      const ord = wantLast ? Math.max(0, usablePositions - 1) : 0
      searchState.current = setTranscriptSearchEngineCursorToOccurrence(
        searchState.current,
        searchState.current.cursor.ptr,
        ord,
      )
      startPtrRef.current = -1
      highlightRef.current(ord)
      const pending = pendingStepRef.current
      if (pending) {
        pendingStepRef.current = 0
        stepRef.current(pending)
      }
      return true
    },
    [
      beginSeek,
      bumpSeek,
      clearActiveResult,
      drainPendingStep,
      scanElement,
      scrollRef,
      jumpStateRef,
    ],
  )

  function targetFor(index: number): number {
    const top = jumpStateRef.current.getItemTop(index)
    return Math.max(0, top - HEADROOM)
  }

  function getUsableCurrentPositions(st: TranscriptSearchEngineState): {
    msgIdx: number
    positions: MatchPosition[]
    usablePositions: number
  } {
    const { msgIdx, positions } = elementPositions.current
    const currentMessageOccurrenceCount =
      getTranscriptSearchEngineCurrentMessageOccurrenceCount(st)
    return {
      msgIdx,
      positions,
      usablePositions: Math.min(positions.length, currentMessageOccurrenceCount),
    }
  }

  function highlight(ord: number): void {
    const s = scrollRef.current
    const { msgIdx, positions, usablePositions } = getUsableCurrentPositions(
      searchState.current,
    )
    if (!s || positions.length === 0 || msgIdx < 0) {
      clearActiveResult()
      return
    }
    const st = searchState.current
    if (usablePositions <= 0) {
      clearActiveResult()
      return
    }
    const idx = Math.max(0, Math.min(ord, usablePositions - 1))
    setActiveResultMatch(msgIdx, idx)
    const p = positions[idx]!
    const top = jumpStateRef.current.getItemTop(msgIdx)
    const el = jumpStateRef.current.getItemElement(msgIdx)
    const vpTop = s.getViewportTop()
    let lo = top - s.getScrollTop()
    const vp = s.getViewportHeight()
    let rowOffset = el ? (nodeCache.get(el)?.y ?? vpTop + lo) : vpTop + lo
    let screenRow = rowOffset + p.row
    if (screenRow < vpTop || screenRow >= vpTop + vp) {
      s.scrollTo(Math.max(0, top + p.row - HEADROOM))
      lo = top - s.getScrollTop()
      rowOffset = el ? (nodeCache.get(el)?.y ?? vpTop + lo) : vpTop + lo
      screenRow = rowOffset + p.row
    }
    const currentState = setTranscriptSearchEngineCursorToOccurrence(
      st,
      st.cursor.ptr,
      idx,
    )
    searchState.current = currentState
    const badge = getTranscriptSearchEngineBadge(currentState)
    reportTranscriptSearchEngineBadge(searchProgress, currentState)
    logForDebugging(
      `highlight(i=${msgIdx}, ord=${idx}/${positions.length}): ` +
        `pos={row:${p.row},col:${p.col}} lo=${lo} screenRow=${screenRow} ` +
        `badge=${badge.current}/${badge.count}`,
    )
  }
  highlightRef.current = highlight

  useEffect(() => {
    const req = scanRequestRef.current
    if (!req) return
    const { idx, wantLast, tries } = req
    const s = scrollRef.current
    if (!s) return
    const { getItemElement, scrollToIndex } = jumpStateRef.current
    const el = getItemElement(idx)
    const height = el?.yogaNode?.getComputedHeight() ?? 0
    if (!el || height === 0) {
      retryUnmountedSeek(idx, wantLast, tries, scrollToIndex)
      return
    }
    finishSeekAtMountedElement(idx, wantLast, tries, el)
  }, [finishSeekAtMountedElement, retryUnmountedSeek, seekGen, scrollRef, jumpStateRef])

  function jump(index: number, wantLast: boolean): void {
    const s = scrollRef.current
    if (!s) return
    const runtime = jumpStateRef.current
    const { getItemElement, scrollToIndex } = runtime
    if (index < 0 || index >= runtime.messages.length) return
    resetSearchViewportState()
    beginSeek(index, wantLast, 0)
    const el = getItemElement(index)
    const height = el?.yogaNode?.getComputedHeight() ?? 0
    if (el && height > 0) {
      s.scrollTo(targetFor(index))
    } else {
      scrollToIndex(index)
    }
    bumpSeek()
  }

  function step(delta: 1 | -1): void {
    const st = searchState.current
    if (!hasTranscriptSearchEngineMatches(st)) return
    if (scanRequestRef.current) {
      pendingStepRef.current = delta
      return
    }
    if (startPtrRef.current < 0) startPtrRef.current = st.cursor.ptr
    const { usablePositions } = getUsableCurrentPositions(st)
    const targetMsgIdx = getTranscriptSearchEngineCurrentMessageIndex(st) ?? -1
    if (
      usablePositions <= 0 &&
      targetMsgIdx >= 0 &&
      elementPositions.current.msgIdx !== targetMsgIdx
    ) {
      pendingStepRef.current = delta
      logForDebugging(
        `step: pending delta=${delta} while target ptr=${st.cursor.ptr} msgIdx=${targetMsgIdx} is unresolved`,
      )
      jump(targetMsgIdx, delta < 0)
      return
    }
    const stepResult = stepTranscriptSearchEngine(st, delta)
    const nextState = stepResult.state
    const newOrd = nextState.cursor.occurrenceOrdinal
    if (stepResult.stayedOnMessage && newOrd >= 0 && newOrd < usablePositions) {
      searchState.current = nextState
      highlight(newOrd)
      startPtrRef.current = -1
      return
    }

    const ptr = nextState.cursor.ptr
    if (ptr === startPtrRef.current) {
      if (usablePositions > 0) {
        const wrapOrd = delta < 0 ? usablePositions - 1 : 0
        searchState.current = setTranscriptSearchEngineCursorToOccurrence(
          st,
          ptr,
          wrapOrd,
        )
        highlight(wrapOrd)
        startPtrRef.current = -1
        logForDebugging(`step: wrapped within ptr=${ptr} to ord=${wrapOrd}`)
        return
      }
      clearActiveResult()
      startPtrRef.current = -1
      logForDebugging(
        `step: wraparound at ptr=${ptr}, all ${st.snapshot.matches.length} msgs phantoms`,
      )
      return
    }
    const nextTargetMsgIdx = stepResult.nextMessageIndex
    if (nextTargetMsgIdx === null) {
      return
    }
    searchState.current = nextState
    jump(nextTargetMsgIdx, delta < 0)
    reportTranscriptSearchEngineBadge(searchProgress, searchState.current)
  }
  stepRef.current = step

  const jumpToIndex = useCallback(
    (index: number) => {
      const s = scrollRef.current
      if (s) s.scrollTo(targetFor(index))
    },
    [scrollRef],
  )

  const applySearchQuery = useCallback(
    (query: string) => {
      scanRequestRef.current = null
      startPtrRef.current = -1
      resetSearchViewportState()
      const s = scrollRef.current
      const nextState = buildTranscriptSearchEngineState(
        query,
        jumpStateRef.current.messages,
        extractSearchText,
        searchState.current.snapshot.query
          ? {
              query: searchState.current.snapshot.query,
              cursor: searchState.current.cursor,
            }
          : undefined,
      )
      if (nextState.snapshot.matches.length > 0 && s) {
        const targetMsgIdx = getTranscriptSearchEngineCurrentMessageIndex(nextState)
        const curTop =
          searchAnchor.current >= 0 ? searchAnchor.current : s.getScrollTop()
        logForDebugging(
          `setSearchQuery('${query}'): ${nextState.snapshot.matches.length} msgs · ptr=${nextState.cursor.ptr} ` +
            `msgIdx=${targetMsgIdx} curTop=${curTop}`,
        )
      }
      setSearchEngineState(nextState)
      if (nextState.snapshot.matches.length > 0) {
        const targetMsgIdx = getTranscriptSearchEngineCurrentMessageIndex(nextState)
        if (targetMsgIdx !== null) {
          jump(targetMsgIdx, nextState.cursor.occurrenceOrdinal > 0)
        }
      } else if (searchAnchor.current >= 0 && s) {
        s.scrollTo(searchAnchor.current)
      }
      reportTranscriptSearchEngineBadge(searchProgress, nextState)
    },
    [
      extractSearchText,
      jump,
      jumpStateRef,
      resetSearchViewportState,
      scrollRef,
      searchProgress,
      setSearchEngineState,
    ],
  )

  const refreshCurrentMatch = useCallback(() => {
    const st = searchState.current
    if (!hasTranscriptSearchEngineMatches(st)) {
      clearActiveResult()
      return
    }
    const { msgIdx, usablePositions } = getUsableCurrentPositions(st)
    if (
      msgIdx === getTranscriptSearchEngineCurrentMessageIndex(st) &&
      usablePositions > 0
    ) {
      highlightRef.current(st.cursor.occurrenceOrdinal)
      return
    }
    const targetMsgIdx = getTranscriptSearchEngineCurrentMessageIndex(st)
    if (targetMsgIdx !== null) {
      jump(targetMsgIdx, st.cursor.occurrenceOrdinal > 0)
    }
  }, [clearActiveResult])

  const setSearchAnchor = useCallback(() => {
    const s = scrollRef.current
    if (s) searchAnchor.current = s.getScrollTop()
  }, [scrollRef])

  const disarmSearch = useCallback(() => {
    clearActiveResult()
    scanRequestRef.current = null
    elementPositions.current = {
      msgIdx: -1,
      positions: [],
    }
    startPtrRef.current = -1
  }, [clearActiveResult])

  const warmSearchIndex = useCallback(async () => {
    if (indexWarmed.current) return 0
    const messages = jumpStateRef.current.messages
    const CHUNK = 500
    let workMs = 0
    const wallStart = performance.now()
    for (let i = 0; i < messages.length; i += CHUNK) {
      await sleep(0)
      const t0 = performance.now()
      const end = Math.min(i + CHUNK, messages.length)
      for (let j = i; j < end; j++) {
        extractSearchText(messages[j]!)
      }
      workMs += performance.now() - t0
    }
    const wallMs = Math.round(performance.now() - wallStart)
    logForDebugging(
      `warmSearchIndex: ${messages.length} msgs · work=${Math.round(workMs)}ms wall=${wallMs}ms chunks=${Math.ceil(messages.length / CHUNK)}`,
    )
    indexWarmed.current = true
    return Math.round(workMs)
  }, [extractSearchText, jumpStateRef])

  useImperativeHandle(
    jumpRef,
    () => ({
      jumpToIndex,
      setSearchQuery: applySearchQuery,
      nextMatch: () => step(1),
      prevMatch: () => step(-1),
      refreshCurrentMatch,
      setAnchor: setSearchAnchor,
      disarmSearch,
      warmSearchIndex,
    }),
    [
      applySearchQuery,
      disarmSearch,
      jumpRef,
      jumpToIndex,
      refreshCurrentMatch,
      setSearchAnchor,
      warmSearchIndex,
    ],
  )

  return {
    activeResult,
    matchedMessageIdxs,
  }
}
