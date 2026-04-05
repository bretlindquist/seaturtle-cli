import * as React from 'react'
import { Box, Text } from '../../ink.js'

type SeaTurtleMarkProps = {
  size?: 'compact' | 'hero'
}

const COMPACT_SEA_TURTLE = [
  '         ▄███▄',
  '        ███████',
  '        ▀█████▀',
  '  ▄██████████████████▄',
  '     ▄████████████▄',
  '     ▀████████████▀',
  '      ▀██████████',
  '      ▄██████████▄',
  '     ▀▀▀        ▀▀▀',
] as const

const HERO_SEA_TURTLE = [
  '                                    ▁▁▃▃▃▃▃▃▃▃▃▃▁▁',
  '                                 ▂▃▃▃▂▁   ▁▄▆▄▆███▆▅▂▁',
  '                               ▂▃▂▁▁▁     ▁  ▁▄▄█████▇▂',
  '                              ▂▄▁▂▃▄▄▃▂▁      ▁▆▇██████',
  '                              ▅▁▁▄█▃▃▇▃▃   ▁  ▁▃▆█▆▄███▄',
  '                              ▄ ▂▇█▇▆██▁▁  ▁▁ ▂▂▇██▆███▄',
  '                              ▄  ▅█████ ▁▁ ▃▄ ▅▁▂██████▄',
  '                              ▅▁ ▁▅▇██▅         ▁▃█████▃',
  '                       ▁▂▂▂▂▂▂▄▂     ▁            ▁▃▃▄▇▁',
  '                  ▁▃▃▆▇▄▃▂▂▂▄██▇▁▁▃▄▂▁▁▁▁▂▂▃▃▂▂▂▂▂▃▃▃▄▃',
  '               ▂▄▄▃▄▅▇▇▆▆▆▆▇█████▅▂▁▁▂▂▂▂▁▁▁   ▁▂▃▁▃▄▂',
  '            ▁▄▆▄▄▆▅▄▁     ▅███▇▃▅██▇▆▅▄▃▂▂▂▂▂▃▄▃▃▃▃▁',
  '          ▁▄▅▄▆█▆▁   ▁ ▂▅▇███▇▄▅█████████████▄▆▁',
  '        ▁▃▆▁ ▂▇█▁  ▁▂▃▅████▇▃ ▄██▅▆▇███▇▄▃▅▅▂▃█▅▄▁',
  '       ▁▆▆▁ ▁▇██▇▇████████▄▁ ▁▇▇▁   ▂▂▅█▅▁▂▁▂▅████▃',
  '      ▂▇▇▃▄▆████████████▅▄▃▁▂▇█▃▁▁▁▁▁ ▁▅█▆ ▂▅▂████▇▁',
  '   ▁▃▃█████████████▇▅▄▃▁▁▁▅█████▃   ▁  ▆██▆▃▃██████▂',
  '   ▅▂▄▃▄▆▄▃▃▆▂▁▁▁▁▄▁  ▁▃▅▅▄▁▄▇██▄     ▁▂▆██▆███████▂',
  '  ▁▂▄▇██▇▅▆▇▇▅▅▅▅▅▅▅▄▄▄▃▁ ▂▂▂▁▁▃▄     ▁▁▂█████████▇▁',
  '▂▆▄▂▂▂▄▄▆▆▇███▇▂▁▂▂    ▁▂▂▁▁▁▄▄▃▅▁    ▁▄▄▇█████████',
  '▅▄▂▃▂▅▃▁▁ ▁▄███▇▄▄▅▄▃▄▅▆▇▇▇▅▄▃▅▄▅▃▁   ▁▃▃▇██▅▆▆▆▆▆▃',
  '▁▂▃▄▅▄▃▄▄▃▃▄▂▂▁                 ▁▃▄▄▃▄▅▄▆▆▆▄',
] as const

export function SeaTurtleMark({
  size = 'compact',
}: SeaTurtleMarkProps): React.ReactNode {
  const lines = size === 'hero' ? HERO_SEA_TURTLE : COMPACT_SEA_TURTLE

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => (
        <Text key={`${size}-${index}`} color="claude">
          {line}
        </Text>
      ))}
    </Box>
  )
}

export function SeaTurtleWordmark({
  dimColor = false,
}: {
  dimColor?: boolean
}): React.ReactNode {
  return (
    <Text bold={!dimColor} color={dimColor ? undefined : 'claude'} dimColor={dimColor}>
      SeaTurtle
    </Text>
  )
}
