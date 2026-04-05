import React from 'react'
import { Box, Text } from 'src/ink.js'
import { SeaTurtleMark, SeaTurtleWordmark } from './SeaTurtleMark.js'

const WELCOME_V2_WIDTH = 68

export function WelcomeV2() {
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
      <Text dimColor={true}>A playful CT shell for focused local work.</Text>
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
      </Box>
    </Box>
  )
}
