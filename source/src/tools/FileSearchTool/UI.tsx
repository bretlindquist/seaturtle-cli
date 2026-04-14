import React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
import { TOOL_SUMMARY_MAX_LENGTH } from '../../constants/toolLimits.js'
import { Box, Text } from '../../ink.js'
import type { ProgressMessage } from '../../types/message.js'
import { truncate } from '../../utils/format.js'
import type { Output } from './FileSearchTool.js'

export function renderToolUseMessage(
  { query }: Partial<{ query: string }>,
  _options: { verbose: boolean },
): React.ReactNode {
  return query ? `"${query}"` : null
}

export function renderToolUseProgressMessage(): React.ReactNode {
  return (
    <MessageResponse>
      <Text dimColor>Searching configured files…</Text>
    </MessageResponse>
  )
}

export function renderToolResultMessage(output: Output): React.ReactNode {
  const timeDisplay =
    output.durationSeconds >= 1
      ? `${Math.round(output.durationSeconds)}s`
      : `${Math.round(output.durationSeconds * 1000)}ms`

  return (
    <Box justifyContent="space-between" width="100%">
      <MessageResponse height={1}>
        <Text>
          Searched {output.results.length} file
          {output.results.length !== 1 ? 's' : ''} in {timeDisplay}
        </Text>
      </MessageResponse>
    </Box>
  )
}

export function getToolUseSummary(
  input: Partial<{ query: string }> | undefined,
): string | null {
  if (!input?.query) {
    return null
  }

  return truncate(input.query, TOOL_SUMMARY_MAX_LENGTH)
}
