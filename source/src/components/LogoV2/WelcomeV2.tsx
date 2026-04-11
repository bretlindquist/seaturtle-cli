import React from 'react'
import { Box, Text } from 'src/ink.js'
import { SeaTurtleMark, SeaTurtleWordmark } from './SeaTurtleMark.js'
import { getWakeupLine } from '../../services/projectIdentity/lore.js'
import { getCtCanonCallback } from '../../services/projectIdentity/canonCallbacks.js'
import { getSessionResumeAffordanceText } from '../../services/sessionResume/sessionResumeCopy.js'

const WELCOME_V2_WIDTH = 68

export function WelcomeV2() {
  const canonCallback = getCtCanonCallback()

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
        <Text dimColor={true}>
          Start with /login, /ct, or /telegram and CT will guide the next step.
        </Text>
        <Text dimColor={true}>
          If you want to slow down first, ask for a research pass or a surgical
          plan.
        </Text>
        <Text dimColor={true}>{getSessionResumeAffordanceText()}</Text>
      </Box>
    </Box>
  )
}
