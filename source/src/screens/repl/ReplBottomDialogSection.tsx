import * as React from 'react';
import { ReplFocusedDialogs } from './ReplFocusedDialogs.js';
import { ReplPermissionOverlays } from './ReplPermissionOverlays.js';

type ReplBottomDialogSectionProps = {
  permissionOverlaysProps: React.ComponentProps<typeof ReplPermissionOverlays>
  focusedDialogsProps: React.ComponentProps<typeof ReplFocusedDialogs>
  ultraplanChoiceDialog: React.ReactNode
  ultraplanLaunchDialog: React.ReactNode
}

export function ReplBottomDialogSection({
  permissionOverlaysProps,
  focusedDialogsProps,
  ultraplanChoiceDialog,
  ultraplanLaunchDialog,
}: ReplBottomDialogSectionProps) {
  return <>
      <ReplPermissionOverlays {...permissionOverlaysProps} />
      <ReplFocusedDialogs {...focusedDialogsProps} />
      {ultraplanChoiceDialog}
      {ultraplanLaunchDialog}
    </>;
}
