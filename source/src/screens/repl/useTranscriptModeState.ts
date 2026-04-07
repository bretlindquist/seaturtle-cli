import { useCallback, useState } from 'react';

type FrozenTranscriptState = {
  messagesLength: number
  streamingToolUsesLength: number
}

type UseTranscriptModeStateInput = {
  messagesLength: number
  streamingToolUsesLength: number
}

export function useTranscriptModeState({
  messagesLength,
  streamingToolUsesLength,
}: UseTranscriptModeStateInput) {
  const [frozenTranscriptState, setFrozenTranscriptState] =
    useState<FrozenTranscriptState | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCount, setSearchCount] = useState(0)
  const [searchCurrent, setSearchCurrent] = useState(0)

  const handleEnterTranscript = useCallback(() => {
    setFrozenTranscriptState({
      messagesLength,
      streamingToolUsesLength,
    })
  }, [messagesLength, streamingToolUsesLength])

  const handleExitTranscript = useCallback(() => {
    setFrozenTranscriptState(null)
  }, [])

  const onSearchMatchesChange = useCallback((count: number, current: number) => {
    setSearchCount(count)
    setSearchCurrent(current)
  }, [])

  return {
    frozenTranscriptState,
    setFrozenTranscriptState,
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchCount,
    setSearchCount,
    searchCurrent,
    setSearchCurrent,
    handleEnterTranscript,
    handleExitTranscript,
    onSearchMatchesChange,
  }
}
