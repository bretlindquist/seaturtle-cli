import { useCallback } from 'react';
import { runQueuedReplInput } from './runQueuedReplInput.js';

export function useReplQueuedInputProcessor({
  queryGuard,
  commands,
  setToolJSX,
  getToolUseContext,
  messages,
  mainLoopModel,
  ideSelection,
  setUserInputOnProcessing,
  setAbortController,
  onQuery,
  setAppState,
  onBeforeQuery,
  canUseTool,
  addNotification,
  setMessages,
}: {
  queryGuard: any;
  commands: any[];
  setToolJSX: (value: any) => void;
  getToolUseContext: (...args: any[]) => any;
  messages: any[];
  mainLoopModel: string;
  ideSelection: any;
  setUserInputOnProcessing: (value: any) => void;
  setAbortController: (value: AbortController | null) => void;
  onQuery: (...args: any[]) => Promise<void>;
  setAppState: (updater: any) => void;
  onBeforeQuery: any;
  canUseTool: any;
  addNotification: (value: any) => void;
  setMessages: (updater: any) => void;
}) {
  return useCallback(
    async (queuedCommands: any[]) => {
      await runQueuedReplInput({
        queuedCommands,
        executeArgs: {
          queryGuard,
          commands,
          setToolJSX,
          getToolUseContext,
          messages,
          mainLoopModel,
          ideSelection,
          setUserInputOnProcessing,
          setAbortController,
          onQuery,
          setAppState,
          onBeforeQuery,
          canUseTool,
          addNotification,
          setMessages,
        },
      });
    },
    [
      addNotification,
      canUseTool,
      commands,
      getToolUseContext,
      ideSelection,
      mainLoopModel,
      messages,
      onBeforeQuery,
      onQuery,
      queryGuard,
      setAbortController,
      setAppState,
      setMessages,
      setToolJSX,
      setUserInputOnProcessing,
    ],
  );
}
