import React from 'react'
import { Box, Text } from 'src/ink.js'
import { SeaTurtleMark, SeaTurtleWordmark } from './SeaTurtleMark.js'
import { getWakeupLine } from '../../services/projectIdentity/lore.js'
import { getCtCanonCallback } from '../../services/projectIdentity/canonCallbacks.js'
import { getWelcomeBodyLines, type WelcomeMode } from './welcomeCopyCore.js'

const WELCOME_V2_WIDTH = 68

export function WelcomeV2({
  mode = 'default',
}: {
  mode?: WelcomeMode
}) {
  const canonCallback = getCtCanonCallback()
  const bodyLines = getWelcomeBodyLines(mode)

  return (
    <Box
      width={WELCOME_V2_WIDTH}
      flexDirection="column"
      alignItems="center"
    >
      <Text>
        <Text color="claude">Welcome to SeaTurtle</Text>{' '}
        <Text dimColor={true}>v{MACRO.VERSION}</Text>
      </Text>
      <Text dimColor={true}>{canonCallback ?? getWakeupLine(0)}</Text>
      <Box marginTop={1}>
        <SeaTurtleMark size="hero" />
      </Box>
      <Box marginTop={1}>
        <SeaTurtleWordmark />
      </Box>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        {bodyLines.map(line => (
          <Text key={line} dimColor={true}>
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  )
}
