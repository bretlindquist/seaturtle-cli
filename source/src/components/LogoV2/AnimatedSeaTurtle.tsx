import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box } from '../../ink.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { SeaTurtleMark } from './SeaTurtleMark.js'

const FRAMES = [
  'success',
  'success',
  'rainbow_blue_shimmer',
  'success',
  'success',
  'rainbow_blue_shimmer',
  'success',
  'success',
] as const
const FRAME_MS = 165

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

  const frameColor = frameIndex === -1 ? 'success' : (FRAMES[frameIndex] ?? 'success')

  return (
    <Box flexDirection="column">
      <Box flexShrink={0}>
        <SeaTurtleMark size="compact" color={frameColor} />
      </Box>
    </Box>
  )
}
