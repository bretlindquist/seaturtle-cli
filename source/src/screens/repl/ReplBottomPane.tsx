import * as React from 'react';
import { Box } from '../../ink.js';

type ReplBottomPaneProps = {
  permissionStickyFooter: React.ReactNode
  immediateLocalJsx: React.ReactNode
  standaloneTodos: React.ReactNode
  dialogSection: React.ReactNode
  moreRightNode: React.ReactNode
  promptChrome: React.ReactNode
  messageActionsBar: React.ReactNode
  messageSelector: React.ReactNode
  antChrome: React.ReactNode
}

export function ReplBottomPane({
  permissionStickyFooter,
  immediateLocalJsx,
  standaloneTodos,
  dialogSection,
  moreRightNode,
  promptChrome,
  messageActionsBar,
  messageSelector,
  antChrome,
}: ReplBottomPaneProps) {
  return <Box flexDirection="column" flexGrow={1}>
      {permissionStickyFooter}
      {immediateLocalJsx}
      {standaloneTodos}
      {dialogSection}
      {moreRightNode}
      {promptChrome}
      {messageActionsBar}
      {messageSelector}
      {antChrome}
    </Box>;
}
