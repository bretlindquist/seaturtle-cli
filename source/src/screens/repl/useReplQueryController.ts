import { feature } from 'bun:bundle';
import { randomUUID } from 'crypto';
import { useCallback } from 'react';
import { mergeClients } from '../../hooks/useMergedClients.js';
import { closeOpenDiffs, getConnectedIdeClient } from '../../utils/ide.js';
import { diagnosticTracker } from '../../services/diagnosticTracking.js';
import { maybeMarkProjectOnboardingComplete } from '../../projectOnboardingState.js';
import { buildEffectiveSystemPrompt } from '../../utils/systemPrompt.js';
import { getCwd } from '../../utils/cwd.js';
import { queryCheckpoint } from '../../utils/queryProfiler.js';
import { getQuerySourceForREPL } from '../../utils/promptCategory.js';
import { getContentText, isCompactBoundaryMessage } from '../../utils/messages.js';
import { generateSessionTitle } from '../../utils/sessionTitle.js';
import { setMemberActive } from '../../utils/swarm/teamHelpers.js';
import { getAgentName, getTeamName } from '../../utils/teammate.js';
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js';
import { runOuterReplQuery } from './runOuterReplQuery.js';
import { maybeGenerateFirstQuerySessionTitle, syncTurnAllowedTools } from './queryTurnPreparation.js';
import { loadReplQueryRuntimeContext } from './loadReplQueryRuntimeContext.js';
import { buildReplTurnAppendSystemPrompt } from './buildReplTurnAppendSystemPrompt.js';
import { runReplQueryLoop } from './runReplQueryLoop.js';
import { finalizeReplQueryTurn } from './finalizeReplQueryTurn.js';
import { useReplQueryEventHandler } from './useReplQueryEventHandler.js';
import type { EditablePromptInputMode } from '../../types/textInputTypes.js';

export function useReplQueryController({
  initialMcpClients,
  store,
  titleDisabled,
  sessionTitle,
  agentTitle,
  haikuTitleAttemptedRef,
  setHaikuTitle,
  getRecentUserPromptTexts,
  setAppState,
  setLastQueryCompletionTime,
  setConversationId,
  resetLoadingState,
  setAbortController,
  getToolUseContext,
  toolPermissionContext,
  appendSystemPrompt,
  customSystemPrompt,
  canUseTool,
  mainThreadAgentDefinition,
  onTurnComplete,
  addNotification,
  messagesRef,
  setMessages,
  apiMetricsRef,
  loadingStartTimeRef,
  fireCompanionObserver,
  responseLengthRef,
  setResponseLength,
  setStreamMode,
  setStreamingToolUses,
  setStreamingThinking,
  onStreamingText,
  proactiveModule,
  isFullscreenEnabled,
  isReplAntBuild,
  getSystemPrompt,
  getUserContext,
  getSystemContext,
  getCoordinatorUserContext,
  isScratchpadEnabled,
  getScratchpadDir,
  terminalFocusRef,
  queryGuard,
  resetTimingRefs,
  setStreamingText,
  mrOnBeforeQuery,
  mrOnTurnComplete,
  sendBridgeResultRef,
  skipIdleCheckRef,
  totalPausedMsRef,
  proactiveActive,
  swarmStartTimeRef,
  swarmBudgetInfoRef,
  inputValueRef,
  restoreMessageSyncRef,
}: {
  initialMcpClients: any[];
  store: any;
  titleDisabled: boolean;
  sessionTitle: string | null | undefined;
  agentTitle: string | null | undefined;
  haikuTitleAttemptedRef: { current: boolean };
  setHaikuTitle: (value: any) => void;
  getRecentUserPromptTexts: (messages: any[]) => string[];
  setAppState: (updater: any) => void;
  setLastQueryCompletionTime: (time: number) => void;
  setConversationId: (value: any) => void;
  resetLoadingState: () => void;
  setAbortController: (value: AbortController | null) => void;
  getToolUseContext: (...args: any[]) => any;
  toolPermissionContext: any;
  appendSystemPrompt: any;
  customSystemPrompt: any;
  canUseTool: any;
  mainThreadAgentDefinition: any;
  onTurnComplete?: (messages: any[]) => void | Promise<void>;
  addNotification: (value: any) => void;
  messagesRef: { current: any[] };
  setMessages: (updater: any) => void;
  apiMetricsRef: { current: any[] };
  loadingStartTimeRef: { current: number | null };
  fireCompanionObserver: (...args: any[]) => void;
  responseLengthRef: { current: number };
  setResponseLength: (f: (prev: number) => number) => void;
  setStreamMode: (mode: any) => void;
  setStreamingToolUses: (updater: any) => void;
  setStreamingThinking: (updater: any) => void;
  onStreamingText: ((f: (current: string | null) => string | null) => void) | undefined;
  proactiveModule: any;
  isFullscreenEnabled: () => boolean;
  isReplAntBuild: boolean;
  getSystemPrompt: any;
  getUserContext: any;
  getSystemContext: any;
  getCoordinatorUserContext: any;
  isScratchpadEnabled: () => boolean;
  getScratchpadDir: () => string;
  terminalFocusRef: { current: boolean };
  queryGuard: any;
  resetTimingRefs: () => void;
  setStreamingText: (value: any) => void;
  mrOnBeforeQuery: any;
  mrOnTurnComplete: any;
  sendBridgeResultRef: { current: any };
  skipIdleCheckRef: { current: boolean };
  totalPausedMsRef: { current: number };
  proactiveActive: boolean;
  swarmStartTimeRef: { current: number | null };
  swarmBudgetInfoRef: { current: any };
  inputValueRef: { current: string };
  restoreMessageSyncRef: { current: any };
}) {
  const onQueryEvent = useReplQueryEventHandler({
    setMessages,
    setConversationId,
    setResponseLength,
    setStreamMode,
    setStreamingToolUses,
    setStreamingThinking,
    onStreamingText,
    responseLengthRef,
    apiMetricsRef,
    proactiveModule,
    isFullscreenEnabled,
  });

  const onQueryImpl = useCallback(
    async (
      messagesIncludingNewMessages: any[],
      newMessages: any[],
      abortController: AbortController,
      shouldQuery: boolean,
      additionalAllowedTools: string[],
      mainLoopModelParam: string,
      input?: string,
      inputMode?: EditablePromptInputMode,
      effort?: unknown,
    ) => {
      if (shouldQuery) {
        const freshClients = mergeClients(initialMcpClients, store.getState().mcp.clients);
        void diagnosticTracker.handleQueryStart(freshClients);
        const ideClient = getConnectedIdeClient(freshClients);
        if (ideClient) {
          void closeOpenDiffs(ideClient);
        }
      }

      void maybeMarkProjectOnboardingComplete();

      maybeGenerateFirstQuerySessionTitle({
        newMessages,
        titleDisabled,
        sessionTitle,
        agentTitle,
        haikuTitleAttemptedRef,
        getContentText,
        generateSessionTitle,
        setHaikuTitle,
      });

      syncTurnAllowedTools({
        setAppState: store.setState,
        additionalAllowedTools,
      });

      if (!shouldQuery) {
        if (newMessages.some(isCompactBoundaryMessage)) {
          setConversationId(randomUUID());
          if (feature('PROACTIVE') || feature('KAIROS')) {
            proactiveModule?.setContextBlocked(false);
          }
        }
        resetLoadingState();
        setAbortController(null);
        return;
      }

      const toolUseContext = getToolUseContext(
        messagesIncludingNewMessages,
        newMessages,
        abortController,
        mainLoopModelParam,
      );

      queryCheckpoint('query_context_loading_start');
      const { defaultSystemPrompt, userContext, systemContext } =
        await loadReplQueryRuntimeContext({
          toolUseContext,
          effort: effort as any,
          toolPermissionContext,
          setAppState,
          mainLoopModel: mainLoopModelParam,
          fastMode: store.getState().fastMode,
          getSystemPrompt,
          getUserContext,
          getSystemContext,
          getCoordinatorUserContext,
          isScratchpadEnabled,
          getScratchpadDir,
          terminalFocused: terminalFocusRef.current,
          proactiveActive:
            (feature('PROACTIVE') || feature('KAIROS')) &&
            !!proactiveModule?.isProactiveActive(),
        });
      queryCheckpoint('query_context_loading_end');

      const effectiveAppendSystemPrompt = buildReplTurnAppendSystemPrompt({
        appendSystemPrompt,
        currentInput: input ?? '',
        inputMode,
        recentUserMessages: getRecentUserPromptTexts(messagesIncludingNewMessages),
        cwd: getCwd(),
        messageCount: messagesIncludingNewMessages.length,
      });

      const systemPrompt = buildEffectiveSystemPrompt({
        mainThreadAgentDefinition,
        toolUseContext,
        customSystemPrompt,
        defaultSystemPrompt,
        appendSystemPrompt: effectiveAppendSystemPrompt,
      });

      toolUseContext.renderedSystemPrompt = systemPrompt;
      await runReplQueryLoop({
        messages: messagesIncludingNewMessages,
        systemPrompt,
        userContext,
        systemContext,
        canUseTool,
        toolUseContext,
        onQueryEvent,
        querySource: getQuerySourceForREPL(),
      });

      await finalizeReplQueryTurn({
        messagesRef,
        setMessages,
        setAppState,
        apiMetricsRef,
        loadingStartTimeRef,
        resetLoadingState,
        addNotification,
        onTurnComplete,
        fireCompanionObserver,
      });
    },
    [
      addNotification,
      agentTitle,
      appendSystemPrompt,
      canUseTool,
      customSystemPrompt,
      fireCompanionObserver,
      getRecentUserPromptTexts,
      getCoordinatorUserContext,
      getSystemContext,
      getSystemPrompt,
      getToolUseContext,
      getUserContext,
      haikuTitleAttemptedRef,
      initialMcpClients,
      isScratchpadEnabled,
      loadingStartTimeRef,
      mainThreadAgentDefinition,
      messagesRef,
      onQueryEvent,
      onTurnComplete,
      proactiveModule,
      resetLoadingState,
      setAbortController,
      setAppState,
      setConversationId,
      setHaikuTitle,
      setMessages,
      store,
      terminalFocusRef,
      titleDisabled,
      toolPermissionContext,
      apiMetricsRef,
      isReplAntBuild,
      sessionTitle,
      getScratchpadDir,
    ],
  );

  const onQuery = useCallback(
    async (
      newMessages: any[],
      abortController: AbortController,
      shouldQuery: boolean,
      additionalAllowedTools: string[],
      mainLoopModelParam: string,
      onBeforeQueryCallback?: (input: string, newMessages: any[]) => Promise<boolean>,
      input?: string,
      inputMode?: EditablePromptInputMode,
      effort?: unknown,
    ): Promise<void> => {
      if (isAgentSwarmsEnabled()) {
        const teamName = getTeamName();
        const agentName = getAgentName();
        if (teamName && agentName) {
          void setMemberActive(teamName, agentName, true);
        }
      }

      await runOuterReplQuery({
        newMessages,
        abortController,
        shouldQuery,
        additionalAllowedTools,
        mainLoopModelParam,
        onQueryImpl,
        queryGuard,
        getContentText,
        input,
        inputMode,
        effort,
        prepareArgs: {
          resetTimingRefs,
          setMessages,
          responseLengthRef,
          apiMetricsRef,
          setStreamingToolUses,
          setStreamingText,
          messagesRef,
          mrOnBeforeQuery,
          onBeforeQueryCallback,
        },
        finalizeArgs: {
          setLastQueryCompletionTime,
          skipIdleCheckRef,
          resetLoadingState,
          mrOnTurnComplete,
          messagesRef,
          sendBridgeResult: sendBridgeResultRef.current,
          isReplAntBuild,
          setAppState,
          loadingStartTimeRef,
          totalPausedMsRef,
          proactiveActive,
          tasks: store.getState().tasks,
          swarmStartTimeRef,
          swarmBudgetInfoRef,
          setMessages,
          setAbortController,
        },
        restoreCanceledArgs: {
          inputValue: inputValueRef.current,
          viewingAgentTaskId: store.getState().viewingAgentTaskId,
          messagesRef,
          restoreMessageSync: restoreMessageSyncRef.current,
        },
      });
    },
    [
      apiMetricsRef,
      inputValueRef,
      loadingStartTimeRef,
      messagesRef,
      mrOnBeforeQuery,
      mrOnTurnComplete,
      onQueryImpl,
      proactiveActive,
      queryGuard,
      resetLoadingState,
      resetTimingRefs,
      restoreMessageSyncRef,
      sendBridgeResultRef,
      setAbortController,
      setAppState,
      setLastQueryCompletionTime,
      setMessages,
      setStreamingText,
      setStreamingToolUses,
      skipIdleCheckRef,
      store,
      swarmBudgetInfoRef,
      swarmStartTimeRef,
      totalPausedMsRef,
      responseLengthRef,
      isReplAntBuild,
    ],
  );

  return {
    onQuery,
  };
}
