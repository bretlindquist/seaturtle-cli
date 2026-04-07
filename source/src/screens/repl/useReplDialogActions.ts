import { useCallback } from 'react';
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js';
import type { SetAppState } from '../../utils/messageQueueManager.js';
import { applyPermissionUpdate, persistPermissionUpdate } from '../../utils/permissions/PermissionUpdate.js';
import { WEB_FETCH_TOOL_NAME } from '../../tools/WebFetchTool/prompt.js';
import { SandboxManager } from '../../utils/sandbox/sandbox-adapter.js';
import { saveGlobalConfig } from '../../utils/config.js';
import { sendSandboxPermissionResponseViaMailbox } from '../../utils/swarm/permissionSync.js';

type PromptQueueItem = {
  request: {
    prompt: string
  }
  resolve: (value: { prompt_response: string; selected: string }) => void
  reject: (error: Error) => void
}

type SandboxPermissionQueueItem = {
  hostPattern: {
    host: string
  }
  resolvePromise: (allow: boolean) => void
}

type WorkerSandboxPermissionQueueItem = {
  host: string
  requestId: string
  workerName: string
}

type ElicitationQueueItem = {
  params: {
    mode?: string
  }
  respond: (value: { action: string; content?: string }) => void
  onWaitingDismiss?: (action: string) => void
}

type IdleReturnPending = {
  idleMinutes: number
  input: string
} | null

type UseReplDialogActionsInput = {
  sandboxPermissionRequestQueue: SandboxPermissionQueueItem[]
  setSandboxPermissionRequestQueue: React.Dispatch<React.SetStateAction<SandboxPermissionQueueItem[]>>
  sandboxBridgeCleanupRef: React.RefObject<Map<string, Array<() => void>>>
  setPromptQueue: React.Dispatch<React.SetStateAction<PromptQueueItem[]>>
  promptQueue: PromptQueueItem[]
  workerSandboxPermissions: {
    queue: WorkerSandboxPermissionQueueItem[]
  }
  teamName?: string
  setAppState: SetAppState
  elicitationQueue: ElicitationQueueItem[]
  setShowCostDialog: (value: boolean) => void
  setHaveShownCostDialog: (value: boolean) => void
  idleReturnPending: IdleReturnPending
  setIdleReturnPending: (value: IdleReturnPending) => void
  getTotalInputTokens: () => number
  messagesRef: React.RefObject<readonly unknown[]>
  setInputValue: (value: string) => void
  clearConversation: () => Promise<void>
  setShowIdeOnboarding: (value: boolean) => void
  setShowEffortCallout: (value: boolean) => void
  setShowDesktopUpsellStartup: (value: boolean) => void
}

export function useReplDialogActions({
  sandboxPermissionRequestQueue,
  setSandboxPermissionRequestQueue,
  sandboxBridgeCleanupRef,
  setPromptQueue,
  promptQueue,
  workerSandboxPermissions,
  teamName,
  setAppState,
  elicitationQueue,
  setShowCostDialog,
  setHaveShownCostDialog,
  idleReturnPending,
  setIdleReturnPending,
  getTotalInputTokens,
  messagesRef,
  setInputValue,
  clearConversation,
  setShowIdeOnboarding,
  setShowEffortCallout,
  setShowDesktopUpsellStartup,
}: UseReplDialogActionsInput) {
  const handleSandboxPermissionResponse = useCallback((response: {
    allow: boolean
    persistToSettings: boolean
  }) => {
    const currentRequest = sandboxPermissionRequestQueue[0];
    if (!currentRequest) return;

    const { allow, persistToSettings } = response;
    const approvedHost = currentRequest.hostPattern.host;

    if (persistToSettings) {
      const update = {
        type: 'addRules' as const,
        rules: [{
          toolName: WEB_FETCH_TOOL_NAME,
          ruleContent: `domain:${approvedHost}`,
        }],
        behavior: (allow ? 'allow' : 'deny') as 'allow' | 'deny',
        destination: 'localSettings' as const,
      };
      setAppState(prev => ({
        ...prev,
        toolPermissionContext: applyPermissionUpdate(prev.toolPermissionContext, update),
      }));
      persistPermissionUpdate(update);
      SandboxManager.refreshConfig();
    }

    setSandboxPermissionRequestQueue(queue => {
      queue.filter(item => item.hostPattern.host === approvedHost).forEach(item => item.resolvePromise(allow));
      return queue.filter(item => item.hostPattern.host !== approvedHost);
    });

    const cleanups = sandboxBridgeCleanupRef.current.get(approvedHost);
    if (cleanups) {
      for (const fn of cleanups) {
        fn();
      }
      sandboxBridgeCleanupRef.current.delete(approvedHost);
    }
  }, [sandboxBridgeCleanupRef, sandboxPermissionRequestQueue, setAppState, setSandboxPermissionRequestQueue]);

  const handlePromptRespond = useCallback((selectedKey: string) => {
    const item = promptQueue[0];
    if (!item) return;
    item.resolve({
      prompt_response: item.request.prompt,
      selected: selectedKey,
    });
    setPromptQueue(([, ...tail]) => tail);
  }, [promptQueue, setPromptQueue]);

  const handlePromptAbort = useCallback(() => {
    const item = promptQueue[0];
    if (!item) return;
    item.reject(new Error('Prompt cancelled by user'));
    setPromptQueue(([, ...tail]) => tail);
  }, [promptQueue, setPromptQueue]);

  const handleWorkerSandboxPermissionResponse = useCallback((response: {
    allow: boolean
    persistToSettings: boolean
  }) => {
    const currentRequest = workerSandboxPermissions.queue[0];
    if (!currentRequest) return;

    const { allow, persistToSettings } = response;
    const approvedHost = currentRequest.host;

    void sendSandboxPermissionResponseViaMailbox(currentRequest.workerName, currentRequest.requestId, approvedHost, allow, teamName);
    if (persistToSettings && allow) {
      const update = {
        type: 'addRules' as const,
        rules: [{
          toolName: WEB_FETCH_TOOL_NAME,
          ruleContent: `domain:${approvedHost}`,
        }],
        behavior: 'allow' as const,
        destination: 'localSettings' as const,
      };
      setAppState(prev => ({
        ...prev,
        toolPermissionContext: applyPermissionUpdate(prev.toolPermissionContext, update),
      }));
      persistPermissionUpdate(update);
      SandboxManager.refreshConfig();
    }

    setAppState(prev => ({
      ...prev,
      workerSandboxPermissions: {
        ...prev.workerSandboxPermissions,
        queue: prev.workerSandboxPermissions.queue.slice(1),
      },
    }));
  }, [setAppState, teamName, workerSandboxPermissions.queue]);

  const handleElicitationResponse = useCallback((action: string, content?: string) => {
    const currentRequest = elicitationQueue[0];
    if (!currentRequest) return;
    currentRequest.respond({ action, content });
    const isUrlAccept = currentRequest.params.mode === 'url' && action === 'accept';
    if (!isUrlAccept) {
      setAppState(prev => ({
        ...prev,
        elicitation: {
          queue: prev.elicitation.queue.slice(1),
        },
      }));
    }
  }, [elicitationQueue, setAppState]);

  const handleElicitationWaitingDismiss = useCallback((action: string) => {
    const currentRequest = elicitationQueue[0];
    setAppState(prev => ({
      ...prev,
      elicitation: {
        queue: prev.elicitation.queue.slice(1),
      },
    }));
    currentRequest?.onWaitingDismiss?.(action);
  }, [elicitationQueue, setAppState]);

  const handleCostDone = useCallback(() => {
    setShowCostDialog(false);
    setHaveShownCostDialog(true);
    saveGlobalConfig(current => ({
      ...current,
      hasAcknowledgedCostThreshold: true,
    }));
    logEvent('tengu_cost_threshold_acknowledged', {});
  }, [setHaveShownCostDialog, setShowCostDialog]);

  const handleIdleReturnDone = useCallback(async (action: string) => {
    const pending = idleReturnPending;
    if (!pending) return;
    setIdleReturnPending(null);
    logEvent('tengu_idle_return_action', {
      action: action as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      idleMinutes: Math.round(pending.idleMinutes),
      messageCount: messagesRef.current.length,
      totalInputTokens: getTotalInputTokens(),
    });
    if (action === 'dismiss') {
      setInputValue(pending.input);
      return;
    }
    if (action === 'never') {
      saveGlobalConfig(current => {
        if (current.idleReturnDismissed) return current;
        return {
          ...current,
          idleReturnDismissed: true,
        };
      });
    }
    if (action === 'clear') {
      await clearConversation();
    }
  }, [clearConversation, getTotalInputTokens, idleReturnPending, messagesRef, setIdleReturnPending, setInputValue]);

  const handleIdeOnboardingDone = useCallback(() => {
    setShowIdeOnboarding(false);
  }, [setShowIdeOnboarding]);

  const handleEffortCalloutDone = useCallback((selection: string) => {
    setShowEffortCallout(false);
    if (selection !== 'dismiss') {
      setAppState(prev => ({
        ...prev,
        effortValue: selection,
      }));
    }
  }, [setAppState, setShowEffortCallout]);

  const handleRemoteCalloutDone = useCallback((selection: string) => {
    setAppState(prev => {
      if (!prev.showRemoteCallout) return prev;
      return {
        ...prev,
        showRemoteCallout: false,
        ...(selection === 'enable' && {
          replBridgeEnabled: true,
          replBridgeExplicit: true,
          replBridgeOutboundOnly: false,
        }),
      };
    });
  }, [setAppState]);

  const handleDesktopUpsellDone = useCallback(() => {
    setShowDesktopUpsellStartup(false);
  }, [setShowDesktopUpsellStartup]);

  return {
    handleSandboxPermissionResponse,
    handlePromptRespond,
    handlePromptAbort,
    handleWorkerSandboxPermissionResponse,
    handleElicitationResponse,
    handleElicitationWaitingDismiss,
    handleCostDone,
    handleIdleReturnDone,
    handleIdeOnboardingDone,
    handleEffortCalloutDone,
    handleRemoteCalloutDone,
    handleDesktopUpsellDone,
  };
}
