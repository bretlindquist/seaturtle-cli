import { useCallback, useEffect } from 'react';
import { removeByFilter } from '../../utils/messageQueueManager.js';
import { registerLeaderSetToolPermissionContext, unregisterLeaderSetToolPermissionContext } from '../../utils/swarm/leaderPermissionBridge.js';
import useCanUseTool from '../../hooks/useCanUseTool.js';
import { useSessionBackgrounding } from '../../hooks/useSessionBackgrounding.js';
import { errorMessage } from '../../utils/errors.js';
import { gracefulShutdownSync } from '../../utils/gracefulShutdown.js';
import { logForDebugging } from '../../utils/debug.js';
import { SandboxManager } from 'src/utils/sandbox/sandbox-adapter.js';
import { startReplBackgroundQuery } from './startReplBackgroundQuery.js';
import { createSandboxAskCallback } from './createSandboxAskCallback.js';
import {
  createReplPromptRequester,
  createSetReplToolPermissionContext,
} from './toolPermissionBridge.js';
import { buildReplToolUseContext } from './buildReplToolUseContext.js';

export function useReplToolRuntimeBridge({
  setAppState,
  store,
  setSandboxPermissionRequestQueue,
  sandboxBridgeCleanupRef,
  isAgentSwarmsEnabled,
  addNotification,
  setToolUseConfirmQueue,
  setPromptQueue,
  combinedInitialTools,
  mainThreadAgentDefinition,
  commands,
  debug,
  initialMcpClients,
  ideInstallationStatus,
  dynamicMcpConfig,
  theme,
  allowedAgentTypes,
  thinkingConfig,
  setMessages,
  disabled,
  setIsMessageSelectorVisible,
  reverify,
  readFileStateCurrent,
  setToolJSX,
  terminal,
  onChangeDynamicMcpConfig,
  setIDEToInstallExtension,
  loadedNestedMemoryPathsCurrent,
  discoveredSkillNamesCurrent,
  setResponseLength,
  responseLengthRef,
  apiMetricsRef,
  setStreamMode,
  setSpinnerColor,
  setSpinnerShimmerColor,
  setSpinnerMessage,
  setInProgressToolUseIDs,
  hasInterruptibleToolInProgressRef,
  resume,
  setConversationId,
  customSystemPrompt,
  appendSystemPrompt,
  contentReplacementStateCurrent,
  isReplAntBuild,
  abortController,
  messagesRef,
  mainLoopModel,
  toolPermissionContext,
  terminalTitle,
  setIsExternalLoading,
  resetLoadingState,
  setAbortController,
}: {
  setAppState: (updater: any) => void;
  store: any;
  setSandboxPermissionRequestQueue: (updater: any) => void;
  sandboxBridgeCleanupRef: { current: any };
  isAgentSwarmsEnabled: () => boolean;
  addNotification: (value: any) => void;
  setToolUseConfirmQueue: (updater: any) => void;
  setPromptQueue: (updater: any) => void;
  combinedInitialTools: any[];
  mainThreadAgentDefinition: any;
  commands: any[];
  debug: boolean;
  initialMcpClients: any[];
  ideInstallationStatus: any;
  dynamicMcpConfig: any;
  theme: any;
  allowedAgentTypes: any;
  thinkingConfig: any;
  setMessages: (updater: any) => void;
  disabled: boolean;
  setIsMessageSelectorVisible: (value: boolean) => void;
  reverify: () => void;
  readFileStateCurrent: any;
  setToolJSX: (value: any) => void;
  terminal: any;
  onChangeDynamicMcpConfig: (...args: any[]) => void;
  setIDEToInstallExtension: (value: any) => void;
  loadedNestedMemoryPathsCurrent: Set<string>;
  discoveredSkillNamesCurrent: Set<string>;
  setResponseLength: (updater: any) => void;
  responseLengthRef: { current: number };
  apiMetricsRef: { current: any[] };
  setStreamMode: (value: any) => void;
  setSpinnerColor: (value: any) => void;
  setSpinnerShimmerColor: (value: any) => void;
  setSpinnerMessage: (value: any) => void;
  setInProgressToolUseIDs: (value: any) => void;
  hasInterruptibleToolInProgressRef: { current: boolean };
  resume: (...args: any[]) => any;
  setConversationId: (value: any) => void;
  customSystemPrompt: any;
  appendSystemPrompt: any;
  contentReplacementStateCurrent: any;
  isReplAntBuild: boolean;
  abortController: AbortController | null;
  messagesRef: { current: any[] };
  mainLoopModel: string;
  toolPermissionContext: any;
  terminalTitle: string;
  setIsExternalLoading: (value: boolean) => void;
  resetLoadingState: () => void;
  setAbortController: (value: AbortController | null) => void;
}) {
  const sandboxAskCallback = useCallback(
    createSandboxAskCallback({
      setAppState,
      store,
      setSandboxPermissionRequestQueue,
      sandboxBridgeCleanupRef,
      isAgentSwarmsEnabled,
    }),
    [setAppState, store, setSandboxPermissionRequestQueue, sandboxBridgeCleanupRef, isAgentSwarmsEnabled],
  );

  useEffect(() => {
    const reason = SandboxManager.getSandboxUnavailableReason();
    if (!reason) return;
    if (SandboxManager.isSandboxRequired()) {
      process.stderr.write(
        `\nError: sandbox required but unavailable: ${reason}\n` +
          `  sandbox.failIfUnavailable is set — refusing to start without a working sandbox.\n\n`,
      );
      gracefulShutdownSync(1, 'other');
      return;
    }
    logForDebugging(`sandbox disabled: ${reason}`, {
      level: 'warn',
    });
    addNotification({
      key: 'sandbox-unavailable',
      text: 'sandbox disabled · /sandbox',
      priority: 'medium',
    });
  }, [addNotification]);

  useEffect(() => {
    if (!SandboxManager.isSandboxingEnabled()) return;
    void SandboxManager.initialize(sandboxAskCallback).catch(err => {
      process.stderr.write(`\n❌ Sandbox Error: ${errorMessage(err)}\n`);
      gracefulShutdownSync(1, 'other');
    });
  }, [sandboxAskCallback]);

  const setToolPermissionContext = useCallback(
    createSetReplToolPermissionContext({
      setAppState,
      setToolUseConfirmQueue,
    }),
    [setAppState, setToolUseConfirmQueue],
  );

  useEffect(() => {
    registerLeaderSetToolPermissionContext(setToolPermissionContext);
    return () => unregisterLeaderSetToolPermissionContext();
  }, [setToolPermissionContext]);

  const canUseTool = useCanUseTool(setToolUseConfirmQueue, setToolPermissionContext);
  const requestPrompt = useCallback(
    createReplPromptRequester({
      setPromptQueue,
    }),
    [setPromptQueue],
  );

  const getToolUseContext = useCallback(
    buildReplToolUseContext({
      store,
      combinedInitialTools,
      mainThreadAgentDefinition,
      commands,
      debug,
      initialMcpClients,
      ideInstallationStatus,
      dynamicMcpConfig,
      theme,
      allowedAgentTypes,
      thinkingConfig,
      setAppState,
      setMessages,
      disabled,
      setIsMessageSelectorVisible,
      reverify,
      readFileStateCurrent,
      setToolJSX,
      addNotification,
      terminal,
      onChangeDynamicMcpConfig,
      setIDEToInstallExtension,
      loadedNestedMemoryPathsCurrent,
      discoveredSkillNamesCurrent,
      setResponseLength,
      isReplAntBuild,
      responseLengthRef,
      apiMetricsRef,
      setStreamMode,
      setSpinnerColor,
      setSpinnerShimmerColor,
      setSpinnerMessage,
      setInProgressToolUseIDs,
      hasInterruptibleToolInProgressRef,
      resume,
      setConversationId,
      requestPrompt,
      customSystemPrompt,
      appendSystemPrompt,
      contentReplacementStateCurrent,
    }),
    [
      store,
      combinedInitialTools,
      mainThreadAgentDefinition,
      commands,
      debug,
      initialMcpClients,
      ideInstallationStatus,
      dynamicMcpConfig,
      theme,
      allowedAgentTypes,
      thinkingConfig,
      setAppState,
      setMessages,
      disabled,
      setIsMessageSelectorVisible,
      reverify,
      readFileStateCurrent,
      setToolJSX,
      addNotification,
      terminal,
      onChangeDynamicMcpConfig,
      setIDEToInstallExtension,
      loadedNestedMemoryPathsCurrent,
      discoveredSkillNamesCurrent,
      setResponseLength,
      isReplAntBuild,
      responseLengthRef,
      apiMetricsRef,
      setStreamMode,
      setSpinnerColor,
      setSpinnerShimmerColor,
      setSpinnerMessage,
      setInProgressToolUseIDs,
      hasInterruptibleToolInProgressRef,
      resume,
      setConversationId,
      requestPrompt,
      customSystemPrompt,
      appendSystemPrompt,
      contentReplacementStateCurrent,
    ],
  );

  const handleBackgroundQuery = useCallback(() => {
    startReplBackgroundQuery({
      abortController,
      removeByFilter,
      getToolUseContext,
      messagesRef,
      mainLoopModel,
      toolPermissionContext,
      mainThreadAgentDefinition,
      customSystemPrompt,
      appendSystemPrompt,
      canUseTool,
      terminalTitle,
      setAppState,
    });
  }, [
    abortController,
    appendSystemPrompt,
    canUseTool,
    customSystemPrompt,
    getToolUseContext,
    mainLoopModel,
    mainThreadAgentDefinition,
    messagesRef,
    setAppState,
    terminalTitle,
    toolPermissionContext,
  ]);

  const { handleBackgroundSession } = useSessionBackgrounding({
    setMessages,
    setIsLoading: setIsExternalLoading,
    resetLoadingState,
    setAbortController,
    onBackgroundQuery: handleBackgroundQuery,
  });

  return {
    canUseTool,
    getToolUseContext,
    handleBackgroundSession,
    setToolPermissionContext,
  };
}
