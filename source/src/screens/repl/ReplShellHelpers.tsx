import figures from 'figures';
import * as React from 'react';
import { useEffect, useState, type RefObject } from 'react';
import { Box, Text, useTerminalFocus, useTerminalTitle } from '../../ink.js';
import { useSearchInput } from '../../hooks/useSearchInput.js';
import { useShortcutDisplay } from '../../keybindings/useShortcutDisplay.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';

type TranscriptModeFooterProps = {
  showAllInTranscript: boolean
  virtualScroll: boolean
  searchBadge?: {
    current: number
    count: number
  }
  suppressShowAll?: boolean
  status?: string
}

export function TranscriptModeFooter({
  showAllInTranscript,
  virtualScroll,
  searchBadge,
  suppressShowAll = false,
  status,
}: TranscriptModeFooterProps): React.ReactNode {
  const toggleShortcut = useShortcutDisplay(
    'app:toggleTranscript',
    'Global',
    'ctrl+o',
  )
  const showAllShortcut = useShortcutDisplay(
    'transcript:toggleShowAll',
    'Transcript',
    'ctrl+e',
  )
  const tail = searchBadge
    ? ' · n/N next/prev match'
    : virtualScroll
      ? ` · ${figures.arrowUp}${figures.arrowDown} scroll · home/end top/bottom`
      : suppressShowAll
        ? ''
        : ` · ${showAllShortcut} to ${
            showAllInTranscript ? 'collapse' : 'show all'
          }`

  return (
    <Box
      noSelect
      alignItems="center"
      alignSelf="center"
      borderTopDimColor
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderStyle="single"
      marginTop={1}
      paddingLeft={2}
      width="100%"
    >
      <Text dimColor>
        Showing detailed transcript · {toggleShortcut} to toggle
        {tail}
      </Text>
      {status ? (
        <>
          <Box flexGrow={1} />
          <Text>{status} </Text>
        </>
      ) : searchBadge ? (
        <>
          <Box flexGrow={1} />
          <Text dimColor>
            match {searchBadge.current}/{searchBadge.count}{'  '}
          </Text>
        </>
      ) : null}
    </Box>
  )
}

type TranscriptSearchBarProps = {
  jumpRef: RefObject<JumpHandle | null>
  count: number
  current: number
  onClose: (lastQuery: string) => void
  onCancel: () => void
  initialQuery: string
}

export function TranscriptSearchBar({
  jumpRef,
  count,
  current,
  onClose,
  onCancel,
  initialQuery,
}: TranscriptSearchBarProps): React.ReactNode {
  const { query, cursorOffset } = useSearchInput({
    isActive: true,
    initialQuery,
    onExit: () => onClose(query),
    onCancel,
  })

  const [indexStatus, setIndexStatus] = useState<'building' | { ms: number } | null>(
    'building',
  )

  useEffect(() => {
    let alive = true
    const warm = jumpRef.current?.warmSearchIndex
    if (!warm) {
      setIndexStatus(null)
      return
    }
    setIndexStatus('building')
    warm().then(ms => {
      if (!alive) return
      if (ms < 20) {
        setIndexStatus(null)
      } else {
        setIndexStatus({ ms })
        setTimeout(() => {
          if (alive) setIndexStatus(null)
        }, 2000)
      }
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const warmDone = indexStatus !== 'building'
  useEffect(() => {
    if (!warmDone) return
    jumpRef.current?.setSearchQuery(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, warmDone])

  const cursorChar = cursorOffset < query.length ? query[cursorOffset] : ' '

  return (
    <Box
      borderTopDimColor
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderStyle="single"
      marginTop={1}
      paddingLeft={2}
      width="100%"
      noSelect
    >
      <Text>/</Text>
      <Text>{query.slice(0, cursorOffset)}</Text>
      <Text inverse>{cursorChar}</Text>
      {cursorOffset < query.length ? (
        <Text>{query.slice(cursorOffset + 1)}</Text>
      ) : null}
      <Box flexGrow={1} />
      {indexStatus === 'building' ? (
        <Text dimColor>indexing… </Text>
      ) : indexStatus ? (
        <Text dimColor>indexed in {indexStatus.ms}ms </Text>
      ) : count === 0 && query ? (
        <Text color="error">no matches </Text>
      ) : count > 0 ? (
        <Text dimColor>
          {current}/{count}
          {'  '}
        </Text>
      ) : null}
    </Box>
  )
}

const TITLE_ANIMATION_FRAMES = ['⠂', '⠐']
const TITLE_STATIC_PREFIX = '✳'
const TITLE_ANIMATION_INTERVAL_MS = 960

type AnimatedTerminalTitleProps = {
  isAnimating: boolean
  title: string
  disabled: boolean
  noPrefix?: boolean
}

export function AnimatedTerminalTitle({
  isAnimating,
  title,
  disabled,
  noPrefix,
}: AnimatedTerminalTitleProps): null {
  const terminalFocused = useTerminalFocus()
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (disabled || noPrefix || !isAnimating || !terminalFocused) {
      return
    }
    const interval = setInterval(() => {
      setFrame(current => (current + 1) % TITLE_ANIMATION_FRAMES.length)
    }, TITLE_ANIMATION_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [disabled, noPrefix, isAnimating, terminalFocused])

  const prefix = isAnimating
    ? TITLE_ANIMATION_FRAMES[frame] ?? TITLE_STATIC_PREFIX
    : TITLE_STATIC_PREFIX

  useTerminalTitle(disabled ? null : noPrefix ? title : `${prefix} ${title}`)
  return null
}
