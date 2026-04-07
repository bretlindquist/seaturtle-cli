import type * as React from 'react';
import { Box } from '../../ink.js';

type ReplBottomPaneProps = {
  permissionStickyFooter: React.ReactNode
  immediateLocalJsx: React.ReactNode
  standaloneTodos: React.ReactNode
  permissionOverlays: React.ReactNode
  focusedDialogs: React.ReactNode
  ultraplanChoiceDialog: React.ReactNode
  ultraplanLaunchDialog: React.ReactNode
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
  permissionOverlays,
  focusedDialogs,
  ultraplanChoiceDialog,
  ultraplanLaunchDialog,
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
      {permissionOverlays}
      {focusedDialogs}
      {ultraplanChoiceDialog}
      {ultraplanLaunchDialog}
      {moreRightNode}
      {promptChrome}
      {messageActionsBar}
      {messageSelector}
      {antChrome}
    </Box>;
}
