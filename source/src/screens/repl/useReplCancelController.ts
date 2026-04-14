import { useCallback, useMemo } from 'react';
import { feature } from 'bun:bundle';
import { logForDebugging } from '../../utils/debug.js';
import { createAgentsKilledMessage } from '../../utils/messages.js';
import type { PastedContent } from '../../utils/config.js';
import { cancelActiveReplRequest } from './cancelActiveReplRequest.js';
import { restoreQueuedCancelInput } from './restoreQueuedCancelInput.js';

export function useReplCancelController({
  focusedInputDialog,
  streamMode,
  queryGuard,
  skipIdleCheckRef,
  streamingText,
  setMessages,
  resetLoadingState,
  toolUseConfirmQueue,
  setToolUseConfirmQueue,
  promptQueue,
  setPromptQueue,
  activeRemote,
  abortController,
  setAbortController,
  messagesRef,
  mrOnTurnComplete,
  proactiveModule,
  inputValue,
  setInputValue,
  setInputMode,
  pastedContents,
  setPastedContents,
  isMessageSelectorVisible,
  showBashesDialog,
  screen,
  vimMode,
  toolJSX,
  isSearchingHistory,
  isHelpOpen,
  inputMode,
}: {
  focusedInputDialog: any;
  streamMode: any;
  queryGuard: any;
  skipIdleCheckRef: { current: boolean };
  streamingText: string | null;
  setMessages: (updater: any) => void;
  resetLoadingState: () => void;
  toolUseConfirmQueue: any[];
  setToolUseConfirmQueue: (updater: any) => void;
  promptQueue: any[];
  setPromptQueue: (updater: any) => void;
  activeRemote: any;
  abortController: AbortController | null;
  setAbortController: (value: AbortController | null) => void;
  messagesRef: { current: any[] };
  mrOnTurnComplete: (...args: any[]) => void;
  proactiveModule: any;
  inputValue: string;
  setInputValue: (value: string) => void;
  setInputMode: (value: any) => void;
  pastedContents: Record<number, PastedContent>;
  setPastedContents: (value: any) => void;
  isMessageSelectorVisible: boolean;
  showBashesDialog: boolean;
  screen: string;
  vimMode: any;
  toolJSX: any;
  isSearchingHistory: boolean;
  isHelpOpen: boolean;
  inputMode: any;
}) {
  const onCancel = useCallback(() => {
    logForDebugging(`[onCancel] focusedInputDialog=${focusedInputDialog} streamMode=${streamMode}`);
    cancelActiveReplRequest({
      focusedInputDialog,
      queryGuard,
      skipIdleCheckRef,
      streamingText,
      setMessages,
      resetLoadingState,
      toolUseConfirmQueue,
      setToolUseConfirmQueue,
      promptQueue,
      setPromptQueue,
      activeRemote,
      abortController,
      setAbortController,
      messagesRef,
      mrOnTurnComplete,
      pauseProactive: () => {
        if (feature('PROACTIVE') || feature('KAIROS')) {
          proactiveModule?.pauseProactive();
        }
      },
    });
  }, [
    abortController,
    activeRemote,
    focusedInputDialog,
    messagesRef,
    mrOnTurnComplete,
    promptQueue,
    proactiveModule,
    queryGuard,
    resetLoadingState,
    setAbortController,
    setMessages,
    setPromptQueue,
    setToolUseConfirmQueue,
    skipIdleCheckRef,
    streamMode,
    streamingText,
    toolUseConfirmQueue,
  ]);

  const handleQueuedCommandOnCancel = useCallback(() => {
    restoreQueuedCancelInput({
      inputValue,
      setInputValue,
      setInputMode,
      setPastedContents,
    });
  }, [inputValue, setInputMode, setInputValue, setPastedContents]);

  const handleClearDraft = useCallback(() => {
    setInputValue('');
    setInputMode('prompt');
    setPastedContents({});
  }, [setInputMode, setInputValue, setPastedContents]);

  const cancelRequestProps = useMemo(
    () => ({
      setToolUseConfirmQueue,
      onCancel,
      onAgentsKilled: () => setMessages((prev: any[]) => [...prev, createAgentsKilledMessage()]),
      isMessageSelectorVisible: isMessageSelectorVisible || !!showBashesDialog,
      screen,
      abortSignal: abortController?.signal,
      popCommandFromQueue: handleQueuedCommandOnCancel,
      vimMode,
      isLocalJSXCommand: toolJSX?.isLocalJSXCommand,
      isSearchingHistory,
      isHelpOpen,
      inputMode,
      inputValue,
      hasDraftInput:
        inputValue.length > 0 || Object.keys(pastedContents).length > 0,
      onClearDraft: handleClearDraft,
      streamMode,
    }),
    [
      abortController,
      handleQueuedCommandOnCancel,
      handleClearDraft,
      inputMode,
      inputValue,
      isHelpOpen,
      isMessageSelectorVisible,
      isSearchingHistory,
      onCancel,
      screen,
      setMessages,
      pastedContents,
      setToolUseConfirmQueue,
      showBashesDialog,
      streamMode,
      toolJSX,
      vimMode,
    ],
  );

  return {
    onCancel,
    cancelRequestProps,
  };
}
