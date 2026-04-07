import type * as React from 'react';
import { Box } from '../../ink.js';

type ReplScrollablePaneProps = {
  teammateHeader: React.ReactNode
  messagesNode: React.ReactNode
  awsAuthStatus: React.ReactNode
  placeholderNode: React.ReactNode
  deferredLocalJsx: React.ReactNode
  antMonitor: React.ReactNode
  browserPanel: React.ReactNode
  spinnerNode: React.ReactNode
  briefIdleStatus: React.ReactNode
  queuedCommands: React.ReactNode
}

export function ReplScrollablePane({
  teammateHeader,
  messagesNode,
  awsAuthStatus,
  placeholderNode,
  deferredLocalJsx,
  antMonitor,
  browserPanel,
  spinnerNode,
  briefIdleStatus,
  queuedCommands,
}: ReplScrollablePaneProps) {
  return <>
      {teammateHeader}
      {messagesNode}
      {awsAuthStatus}
      {placeholderNode}
      {deferredLocalJsx}
      {antMonitor}
      {browserPanel}
      <Box flexGrow={1} />
      {spinnerNode}
      {briefIdleStatus}
      {queuedCommands}
    </>;
}
