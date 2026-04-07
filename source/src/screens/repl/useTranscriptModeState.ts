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

  const handleEnterTranscript = useCallback(() => {
    setFrozenTranscriptState({
      messagesLength,
      streamingToolUsesLength,
    })
  }, [messagesLength, streamingToolUsesLength])

  const handleExitTranscript = useCallback(() => {
    setFrozenTranscriptState(null)
  }, [])

  return {
    frozenTranscriptState,
    setFrozenTranscriptState,
    handleEnterTranscript,
    handleExitTranscript,
  }
}
