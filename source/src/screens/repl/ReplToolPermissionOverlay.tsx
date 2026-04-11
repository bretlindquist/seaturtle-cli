import * as React from 'react';
import { PermissionRequest, type ToolUseConfirm } from '../../components/permissions/PermissionRequest.js';

type ReplToolPermissionOverlayProps = {
  focusedInputDialog: string | undefined;
  toolUseConfirmQueue: ToolUseConfirm[];
  onDone: () => void;
  onReject: () => void;
  toolUseContext: React.ComponentProps<typeof PermissionRequest>['toolUseContext'];
  verbose: boolean;
  workerBadge: React.ComponentProps<typeof PermissionRequest>['workerBadge'];
  isFullscreenEnabled: boolean;
  setStickyFooter: React.ComponentProps<typeof PermissionRequest>['setStickyFooter'];
};

export function ReplToolPermissionOverlay({
  focusedInputDialog,
  toolUseConfirmQueue,
  onDone,
  onReject,
  toolUseContext,
  verbose,
  workerBadge,
  isFullscreenEnabled,
  setStickyFooter,
}: ReplToolPermissionOverlayProps): React.ReactNode {
  if (focusedInputDialog !== 'tool-permission') {
    return null;
  }

  const toolUseConfirm = toolUseConfirmQueue[0];
  if (!toolUseConfirm) {
    return null;
  }

  return (
    <PermissionRequest
      key={toolUseConfirm.toolUseID}
      onDone={onDone}
      onReject={onReject}
      toolUseConfirm={toolUseConfirm}
      toolUseContext={toolUseContext}
      verbose={verbose}
      workerBadge={workerBadge}
      setStickyFooter={isFullscreenEnabled ? setStickyFooter : undefined}
    />
  );
}
