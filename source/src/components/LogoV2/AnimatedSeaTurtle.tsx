import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box } from '../../ink.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { SeaTurtleMark } from './SeaTurtleMark.js'

const FRAMES = [1, 0, 1, 0] as const
const FRAME_MS = 90
const COMPACT_TURTLE_HEIGHT = 7

export function AnimatedSeaTurtle(): React.ReactNode {
  const [reducedMotion] = useState(
    () => getInitialSettings().prefersReducedMotion ?? false,
  )
  const [frameIndex, setFrameIndex] = useState(reducedMotion ? -1 : 0)

  useEffect(() => {
    if (reducedMotion || frameIndex === -1) {
      return
    }

    if (frameIndex >= FRAMES.length - 1) {
      setFrameIndex(-1)
      return
    }

    const timer = setTimeout(() => {
      setFrameIndex(current => current + 1)
    }, FRAME_MS)

    return () => clearTimeout(timer)
  }, [frameIndex, reducedMotion])

  const bounceOffset = frameIndex === -1 ? 0 : FRAMES[frameIndex] ?? 0

  return (
    <Box height={COMPACT_TURTLE_HEIGHT} flexDirection="column">
      <Box marginTop={bounceOffset} flexShrink={0}>
        <SeaTurtleMark size="compact" />
      </Box>
    </Box>
  )
}
