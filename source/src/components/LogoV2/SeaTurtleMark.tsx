import * as React from 'react'
import { Box, Text } from '../../ink.js'

type SeaTurtleMarkProps = {
  size?: 'compact' | 'hero'
  color?: string
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
  color = 'success',
}: SeaTurtleMarkProps): React.ReactNode {
  const lines = size === 'hero' ? HERO_SEA_TURTLE : COMPACT_SEA_TURTLE

  return (
    <Box flexDirection="column" flexShrink={0}>
      {lines.map((line, index) => (
        <Text key={`${size}-${index}`} color={color} wrap="truncate-end">
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
