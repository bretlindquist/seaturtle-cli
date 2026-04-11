import type * as React from 'react';
import type { ReplFocusedDialogs } from './ReplFocusedDialogs.js';
import type { ReplPermissionOverlays } from './ReplPermissionOverlays.js';

type BuildReplBottomDialogPropsArgs = {
  focusedInputDialog: string | undefined;
  sandboxHostPattern: React.ComponentProps<typeof ReplPermissionOverlays>['sandboxHostPattern'];
  onSandboxPermissionResponse: React.ComponentProps<typeof ReplPermissionOverlays>['onSandboxPermissionResponse'];
  promptItem: React.ComponentProps<typeof ReplPermissionOverlays>['promptItem'];
  onPromptRespond: React.ComponentProps<typeof ReplPermissionOverlays>['onPromptRespond'];
  onPromptAbort: React.ComponentProps<typeof ReplPermissionOverlays>['onPromptAbort'];
  pendingWorkerRequest: React.ComponentProps<typeof ReplPermissionOverlays>['pendingWorkerRequest'];
  pendingSandboxRequest: React.ComponentProps<typeof ReplPermissionOverlays>['pendingSandboxRequest'];
  workerSandboxRequest: React.ComponentProps<typeof ReplPermissionOverlays>['workerSandboxRequest'];
  onWorkerSandboxPermissionResponse: React.ComponentProps<typeof ReplPermissionOverlays>['onWorkerSandboxPermissionResponse'];
  elicitationEvent: React.ComponentProps<typeof ReplFocusedDialogs>['elicitationEvent'];
  onElicitationResponse: React.ComponentProps<typeof ReplFocusedDialogs>['onElicitationResponse'];
  onElicitationWaitingDismiss: React.ComponentProps<typeof ReplFocusedDialogs>['onElicitationWaitingDismiss'];
  onCostDone: React.ComponentProps<typeof ReplFocusedDialogs>['onCostDone'];
  idleReturnPending: React.ComponentProps<typeof ReplFocusedDialogs>['idleReturnPending'];
  totalInputTokens: number;
  onIdleReturnDone: React.ComponentProps<typeof ReplFocusedDialogs>['onIdleReturnDone'];
  onIdeOnboardingDone: React.ComponentProps<typeof ReplFocusedDialogs>['onIdeOnboardingDone'];
  ideInstallationStatus: React.ComponentProps<typeof ReplFocusedDialogs>['ideInstallationStatus'];
  mainLoopModel: React.ComponentProps<typeof ReplFocusedDialogs>['mainLoopModel'];
  onEffortCalloutDone: React.ComponentProps<typeof ReplFocusedDialogs>['onEffortCalloutDone'];
  onRemoteCalloutDone: React.ComponentProps<typeof ReplFocusedDialogs>['onRemoteCalloutDone'];
  exitFlow: React.ComponentProps<typeof ReplFocusedDialogs>['exitFlow'];
  hintRecommendation: React.ComponentProps<typeof ReplFocusedDialogs>['hintRecommendation'];
  onHintResponse: React.ComponentProps<typeof ReplFocusedDialogs>['onHintResponse'];
  lspRecommendation: React.ComponentProps<typeof ReplFocusedDialogs>['lspRecommendation'];
  onLspResponse: React.ComponentProps<typeof ReplFocusedDialogs>['onLspResponse'];
  onDesktopUpsellDone: React.ComponentProps<typeof ReplFocusedDialogs>['onDesktopUpsellDone'];
};

export function buildReplBottomDialogProps({
  focusedInputDialog,
  sandboxHostPattern,
  onSandboxPermissionResponse,
  promptItem,
  onPromptRespond,
  onPromptAbort,
  pendingWorkerRequest,
  pendingSandboxRequest,
  workerSandboxRequest,
  onWorkerSandboxPermissionResponse,
  elicitationEvent,
  onElicitationResponse,
  onElicitationWaitingDismiss,
  onCostDone,
  idleReturnPending,
  totalInputTokens,
  onIdleReturnDone,
  onIdeOnboardingDone,
  ideInstallationStatus,
  mainLoopModel,
  onEffortCalloutDone,
  onRemoteCalloutDone,
  exitFlow,
  hintRecommendation,
  onHintResponse,
  lspRecommendation,
  onLspResponse,
  onDesktopUpsellDone,
}: BuildReplBottomDialogPropsArgs) {
  return {
    permissionOverlaysProps: {
      focusedInputDialog,
      sandboxHostPattern,
      onSandboxPermissionResponse,
      promptItem,
      onPromptRespond,
      onPromptAbort,
      pendingWorkerRequest,
      pendingSandboxRequest,
      workerSandboxRequest,
      onWorkerSandboxPermissionResponse,
    },
    focusedDialogsProps: {
      focusedInputDialog,
      elicitationEvent,
      onElicitationResponse,
      onElicitationWaitingDismiss,
      onCostDone,
      idleReturnPending,
      totalInputTokens,
      onIdleReturnDone,
      onIdeOnboardingDone,
      ideInstallationStatus,
      mainLoopModel,
      onEffortCalloutDone,
      onRemoteCalloutDone,
      exitFlow,
      hintRecommendation,
      onHintResponse,
      lspRecommendation,
      onLspResponse,
      onDesktopUpsellDone,
    },
  };
}
