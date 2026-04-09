import { feature } from 'bun:bundle';
import { useCallback } from 'react';
import { createAbortController } from '../../utils/abortController.js';
import { runReplSubmit } from './runReplSubmit.js';
import { useInitialMessageProcessing } from './useInitialMessageProcessing.js';
import { useIncomingSubmissions } from './useIncomingSubmissions.js';

export function useReplSubmitController({
  queryGuard,
  isLoading,
  isExternalLoading,
  inputMode,
  commands,
  setInputValue,
  setInputMode,
  setPastedContents,
  setSubmitCount,
  setIDESelection,
  setToolJSX,
  getToolUseContext,
  mainLoopModel,
  pastedContents,
  ideSelection,
  setUserInputOnProcessing,
  setAbortController,
  addNotification,
  onQuery,
  stashedPrompt,
  setStashedPrompt,
  setAppState,
  onBeforeQuery,
  canUseTool,
  activeRemote,
  setMessages,
  awaitPendingHooks,
  repinScroll,
  proactiveModule,
  idleHintShownRef,
  lastQueryCompletionTimeRef,
  messagesRef,
  inputValueRef,
  isFullscreenEnvEnabled,
  skipIdleCheckRef,
  setIdleReturnPending,
  helpersResetArgs,
  tipPickedThisTurnRef,
  readFileState,
  abortController,
  streamModeRef,
  hasInterruptibleToolInProgressRef,
  initialMessage,
  discoveredSkillNamesRef,
  loadedNestedMemoryPathsRef,
  store,
  setConversationId,
  haikuTitleAttemptedRef,
  setHaikuTitle,
  bashTools,
  bashToolsProcessedIdx,
}: {
  queryGuard: any;
  isLoading: boolean;
  isExternalLoading: boolean;
  inputMode: any;
  commands: any[];
  setInputValue: (value: string) => void;
  setInputMode: (value: any) => void;
  setPastedContents: (value: any) => void;
  setSubmitCount: (value: any) => void;
  setIDESelection: (value: any) => void;
  setToolJSX: (value: any) => void;
  getToolUseContext: (...args: any[]) => any;
  mainLoopModel: string;
  pastedContents: Record<string, any>;
  ideSelection: any;
  setUserInputOnProcessing: (value: any) => void;
  setAbortController: (value: AbortController | null) => void;
  addNotification: (value: any) => void;
  onQuery: (...args: any[]) => Promise<void>;
  stashedPrompt: any;
  setStashedPrompt: (value: any) => void;
  setAppState: (updater: any) => void;
  onBeforeQuery: any;
  canUseTool: any;
  activeRemote: any;
  setMessages: (updater: any) => void;
  awaitPendingHooks: () => Promise<void>;
  repinScroll: () => void;
  proactiveModule: any;
  idleHintShownRef: { current: boolean };
  lastQueryCompletionTimeRef: { current: number };
  messagesRef: { current: any[] };
  inputValueRef: { current: string };
  isFullscreenEnvEnabled: () => boolean;
  skipIdleCheckRef: { current: boolean };
  setIdleReturnPending: (value: any) => void;
  helpersResetArgs: {
    resetTimingRefs: () => void;
  };
  tipPickedThisTurnRef: { current: boolean };
  readFileState: any;
  abortController: AbortController | null;
  streamModeRef: { current: any };
  hasInterruptibleToolInProgressRef: { current: boolean };
  initialMessage: string | undefined;
  discoveredSkillNamesRef: { current: Set<string> };
  loadedNestedMemoryPathsRef: { current: Set<string> };
  store: any;
  setConversationId: (value: any) => void;
  haikuTitleAttemptedRef: { current: boolean };
  setHaikuTitle: (value: any) => void;
  bashTools: { current: Set<string> };
  bashToolsProcessedIdx: { current: number };
}) {
  const onSubmit = useCallback(
    async (
      input: string,
      helpers: any,
      speculationAccept?: {
        state: unknown;
        speculationSessionTimeSavedMs: number;
        setAppState: unknown;
      },
      options?: {
        fromKeybinding?: boolean;
      },
    ) => {
      await runReplSubmit({
        input,
        helpers,
        speculationAccept,
        options,
        repinScroll,
        resumeProactive: () => {
          if (feature('PROACTIVE') || feature('KAIROS')) {
            proactiveModule?.resumeProactive();
          }
        },
        immediateLocalJsxArgs: {
          pastedContents,
          commands,
          idleHintShownRef,
          lastQueryCompletionTimeRef,
          messagesRef,
          queryGuard,
          inputValueRef,
          setInputValue,
          setPastedContents,
          setToolJSX,
          addNotification,
          isFullscreenEnvEnabled,
          setMessages,
          stashedPrompt,
          setStashedPrompt,
          getToolUseContext,
          createAbortController,
          mainLoopModel,
        },
        activeRemote,
        skipIdleReturnArgs: {
          skipIdleCheckRef,
          lastQueryCompletionTimeRef,
          setIdleReturnPending,
          setInputValue,
        },
        historyArgs: {
          inputMode,
          pastedContents,
        },
        prepareArgs: {
          isLoading,
          isRemoteMode: activeRemote.isRemoteMode,
          stashedPrompt,
          setInputValue,
          helpers,
          setPastedContents,
          setStashedPrompt,
          setInputMode,
          setIDESelection,
          setSubmitCount,
          tipPickedThisTurnRef,
          inputMode,
          setUserInputOnProcessing,
          resetTimingRefs: helpersResetArgs.resetTimingRefs,
          setAppState,
        },
        speculationArgs: {
          setMessages,
          readFileState,
          createAbortController,
          setAbortController,
          onQuery,
          mainLoopModel,
        },
        remoteSubmitArgs: {
          pastedContents,
          activeRemote,
          commands,
          setMessages,
        },
        localSubmitArgs: {
          queryGuard,
          isExternalLoading,
          inputMode,
          commands,
          setInputValue,
          setInputMode,
          setPastedContents,
          setToolJSX,
          getToolUseContext,
          messagesRef,
          mainLoopModel,
          pastedContents,
          ideSelection,
          setUserInputOnProcessing,
          setAbortController,
          abortController,
          onQuery,
          setAppState,
          onBeforeQuery,
          canUseTool,
          addNotification,
          setMessages,
          streamModeRef,
          hasInterruptibleToolInProgressRef,
          awaitPendingHooks,
          isLoading,
          stashedPrompt,
          setStashedPrompt,
        },
      });
    },
    [
      queryGuard,
      isLoading,
      isExternalLoading,
      inputMode,
      commands,
      setInputValue,
      setInputMode,
      setPastedContents,
      setSubmitCount,
      setIDESelection,
      setToolJSX,
      getToolUseContext,
      mainLoopModel,
      pastedContents,
      ideSelection,
      setUserInputOnProcessing,
      setAbortController,
      addNotification,
      onQuery,
      stashedPrompt,
      setStashedPrompt,
      setAppState,
      onBeforeQuery,
      canUseTool,
      activeRemote,
      setMessages,
      awaitPendingHooks,
      repinScroll,
      proactiveModule,
      idleHintShownRef,
      lastQueryCompletionTimeRef,
      messagesRef,
      inputValueRef,
      isFullscreenEnvEnabled,
      skipIdleCheckRef,
      setIdleReturnPending,
      helpersResetArgs,
      tipPickedThisTurnRef,
      readFileState,
      abortController,
      streamModeRef,
      hasInterruptibleToolInProgressRef,
    ],
  );

  useInitialMessageProcessing({
    initialMessage,
    isLoading,
    setMessages,
    readFileStateRef: readFileState,
    discoveredSkillNamesRef,
    loadedNestedMemoryPathsRef,
    getAppState: () => store.getState(),
    setAppState,
    setConversationId,
    resetConversationChrome: () => {
      haikuTitleAttemptedRef.current = false;
      setHaikuTitle(undefined);
      bashTools.current.clear();
      bashToolsProcessedIdx.current = 0;
    },
    awaitPendingHooks,
    onSubmit,
    onQuery,
    createAbortController,
    setAbortController,
    mainLoopModel,
  });

  const { onAgentSubmit, handleIncomingPrompt } = useIncomingSubmissions({
    queryIsActive: () => queryGuard.isActive,
    createAbortController,
    setAbortController,
    onQuery,
    mainLoopModel,
    setAppState,
    setInputValue,
    getToolUseContext,
    messagesRef,
    canUseTool,
    addNotification,
  });

  return {
    onSubmit,
    onAgentSubmit,
    handleIncomingPrompt,
  };
}
