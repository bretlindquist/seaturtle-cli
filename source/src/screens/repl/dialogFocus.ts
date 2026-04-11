export type FocusedInputDialog =
  | 'message-selector'
  | 'sandbox-permission'
  | 'tool-permission'
  | 'prompt'
  | 'worker-sandbox-permission'
  | 'elicitation'
  | 'cost'
  | 'idle-return'
  | 'init-onboarding'
  | 'ide-onboarding'
  | 'model-switch'
  | 'undercover-callout'
  | 'effort-callout'
  | 'remote-callout'
  | 'lsp-recommendation'
  | 'plugin-hint'
  | 'desktop-upsell'
  | 'ultraplan-choice'
  | 'ultraplan-launch'

type DeriveFocusedInputDialogInput = {
  isExiting: boolean
  exitFlow: unknown
  isMessageSelectorVisible: boolean
  isPromptInputActive: boolean
  hasSandboxPermissionRequest: boolean
  hasToolUseConfirm: boolean
  hasPromptQueue: boolean
  hasWorkerSandboxPermission: boolean
  hasElicitation: boolean
  showingCostDialog: boolean
  idleReturnPending: boolean
  ultraplanEnabled: boolean
  allowDialogsWithAnimation: boolean
  isLoading: boolean
  ultraplanPendingChoice: boolean
  ultraplanLaunchPending: boolean
  showIdeOnboarding: boolean
  antDialogsEnabled: boolean
  showModelSwitchCallout: boolean
  showUndercoverCallout: boolean
  showEffortCallout: boolean
  showRemoteCallout: boolean
  lspRecommendation: boolean
  hintRecommendation: boolean
  showDesktopUpsellStartup: boolean
}

export function deriveFocusedInputDialog({
  isExiting,
  exitFlow,
  isMessageSelectorVisible,
  isPromptInputActive,
  hasSandboxPermissionRequest,
  hasToolUseConfirm,
  hasPromptQueue,
  hasWorkerSandboxPermission,
  hasElicitation,
  showingCostDialog,
  idleReturnPending,
  ultraplanEnabled,
  allowDialogsWithAnimation,
  isLoading,
  ultraplanPendingChoice,
  ultraplanLaunchPending,
  showIdeOnboarding,
  antDialogsEnabled,
  showModelSwitchCallout,
  showUndercoverCallout,
  showEffortCallout,
  showRemoteCallout,
  lspRecommendation,
  hintRecommendation,
  showDesktopUpsellStartup,
}: DeriveFocusedInputDialogInput): FocusedInputDialog | undefined {
  if (isExiting || exitFlow) return undefined
  if (isMessageSelectorVisible) return 'message-selector'
  if (isPromptInputActive) return undefined
  if (hasSandboxPermissionRequest) return 'sandbox-permission'

  if (allowDialogsWithAnimation && hasToolUseConfirm) return 'tool-permission'
  if (allowDialogsWithAnimation && hasPromptQueue) return 'prompt'
  if (allowDialogsWithAnimation && hasWorkerSandboxPermission) {
    return 'worker-sandbox-permission'
  }
  if (allowDialogsWithAnimation && hasElicitation) return 'elicitation'
  if (allowDialogsWithAnimation && showingCostDialog) return 'cost'
  if (allowDialogsWithAnimation && idleReturnPending) return 'idle-return'
  if (
    ultraplanEnabled &&
    allowDialogsWithAnimation &&
    !isLoading &&
    ultraplanPendingChoice
  ) {
    return 'ultraplan-choice'
  }
  if (
    ultraplanEnabled &&
    allowDialogsWithAnimation &&
    !isLoading &&
    ultraplanLaunchPending
  ) {
    return 'ultraplan-launch'
  }

  if (allowDialogsWithAnimation && showIdeOnboarding) return 'ide-onboarding'
  if (
    antDialogsEnabled &&
    allowDialogsWithAnimation &&
    showModelSwitchCallout
  ) {
    return 'model-switch'
  }
  if (
    antDialogsEnabled &&
    allowDialogsWithAnimation &&
    showUndercoverCallout
  ) {
    return 'undercover-callout'
  }
  if (allowDialogsWithAnimation && showEffortCallout) return 'effort-callout'
  if (allowDialogsWithAnimation && showRemoteCallout) return 'remote-callout'
  if (allowDialogsWithAnimation && lspRecommendation) {
    return 'lsp-recommendation'
  }
  if (allowDialogsWithAnimation && hintRecommendation) return 'plugin-hint'
  if (allowDialogsWithAnimation && showDesktopUpsellStartup) {
    return 'desktop-upsell'
  }
  return undefined
}

type DeriveSuppressedDialogsInput = {
  isPromptInputActive: boolean
  hasSandboxPermissionRequest: boolean
  hasToolUseConfirm: boolean
  hasPromptQueue: boolean
  hasWorkerSandboxPermission: boolean
  hasElicitation: boolean
  showingCostDialog: boolean
}

export function deriveHasSuppressedDialogs({
  isPromptInputActive,
  hasSandboxPermissionRequest,
  hasToolUseConfirm,
  hasPromptQueue,
  hasWorkerSandboxPermission,
  hasElicitation,
  showingCostDialog,
}: DeriveSuppressedDialogsInput): boolean {
  return Boolean(
    isPromptInputActive &&
      (hasSandboxPermissionRequest ||
        hasToolUseConfirm ||
        hasPromptQueue ||
        hasWorkerSandboxPermission ||
        hasElicitation ||
        showingCostDialog),
  )
}
