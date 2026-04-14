import React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
import { TOOL_SUMMARY_MAX_LENGTH } from '../../constants/toolLimits.js'
import { Box, Text } from '../../ink.js'
import { truncate } from '../../utils/format.js'
import type { Output } from './ImageGenerationTool.js'

export function renderToolUseMessage({
  prompt,
}: Partial<{
  prompt: string
}>): React.ReactNode {
  if (!prompt) {
    return null
  }
  return `"${prompt}"`
}

export function renderToolResultMessage(output: Output): React.ReactNode {
  const timeDisplay =
    output.durationSeconds >= 1
      ? `${Math.round(output.durationSeconds)}s`
      : `${Math.round(output.durationSeconds * 1000)}ms`

  return (
    <Box justifyContent="space-between" width="100%">
      <MessageResponse height={1}>
        <Text>Generated image in {timeDisplay}</Text>
      </MessageResponse>
    </Box>
  )
}

export function getToolUseSummary(
  input: Partial<{ prompt: string }> | undefined,
): string | null {
  if (!input?.prompt) {
    return null
  }
  return truncate(input.prompt, TOOL_SUMMARY_MAX_LENGTH)
}
