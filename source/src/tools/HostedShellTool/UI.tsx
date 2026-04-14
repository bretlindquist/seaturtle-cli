import React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
import { TOOL_SUMMARY_MAX_LENGTH } from '../../constants/toolLimits.js'
import { Box, Text } from '../../ink.js'
import { truncate } from '../../utils/format.js'
import type { Output } from './HostedShellTool.js'

export function renderToolUseMessage({
  task,
}: Partial<{
  task: string
}>): React.ReactNode {
  if (!task) {
    return null
  }
  return `"${task}"`
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
          Hosted shell completed in {timeDisplay}
        </Text>
      </MessageResponse>
    </Box>
  )
}

export function getToolUseSummary(
  input: Partial<{ task: string }> | undefined,
): string | null {
  if (!input?.task) {
    return null
  }
  return truncate(input.task, TOOL_SUMMARY_MAX_LENGTH)
}
