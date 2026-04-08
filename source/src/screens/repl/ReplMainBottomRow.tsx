import * as React from 'react';
import { Box } from '../../ink.js';
import { CompanionSprite } from '../../buddy/CompanionSprite.js';

type ReplMainBottomRowProps = {
  companionNarrow: boolean
  companionVisible: boolean
  isFullscreenEnabled: boolean
  bottomPane: React.ReactNode
}

export function ReplMainBottomRow({
  companionNarrow,
  companionVisible,
  isFullscreenEnabled,
  bottomPane,
}: ReplMainBottomRowProps) {
  return (
    <Box
      flexDirection={companionNarrow ? 'column' : 'row'}
      width="100%"
      alignItems={companionNarrow ? undefined : 'flex-end'}
    >
      {companionNarrow && isFullscreenEnabled && companionVisible ? <CompanionSprite /> : null}
      {bottomPane}
      {!companionNarrow || !isFullscreenEnabled ? (companionVisible ? <CompanionSprite /> : null) : null}
    </Box>
  );
}
