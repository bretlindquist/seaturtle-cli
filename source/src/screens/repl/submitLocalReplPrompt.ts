import { handlePromptSubmit } from '../../utils/handlePromptSubmit.js';
import { getQuerySourceForREPL } from '../../utils/promptCategory.js';
import { restoreDeferredReplStashedPrompt } from './prepareReplSubmitState.js';

export async function submitLocalReplPrompt({
  input,
  helpers,
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
  isSlashCommand,
  isLoading,
  stashedPrompt,
  setStashedPrompt,
}: {
  input: string;
  helpers: any;
  queryGuard: any;
  isExternalLoading: boolean;
  inputMode: any;
  commands: any[];
  setInputValue: (value: string) => void;
  setInputMode: (value: any) => void;
  setPastedContents: (value: any) => void;
  setToolJSX: (value: any) => void;
  getToolUseContext: (...args: any[]) => any;
  messagesRef: { current: any[] };
  mainLoopModel: any;
  pastedContents: Record<string, any>;
  ideSelection: any;
  setUserInputOnProcessing: (value: string | undefined) => void;
  setAbortController: (value: any) => void;
  abortController: any;
  onQuery: (...args: any[]) => Promise<void>;
  setAppState: (updater: any) => void;
  onBeforeQuery: (...args: any[]) => Promise<void> | void;
  canUseTool: (...args: any[]) => boolean;
  addNotification: (value: any) => void;
  setMessages: (updater: any) => void;
  streamModeRef: { current: any };
  hasInterruptibleToolInProgressRef: { current: boolean };
  awaitPendingHooks: () => Promise<void>;
  isSlashCommand: boolean;
  isLoading: boolean;
  stashedPrompt: any;
  setStashedPrompt: (value: any) => void;
}) {
  await awaitPendingHooks();
  await handlePromptSubmit({
    input,
    helpers,
    queryGuard,
    isExternalLoading,
    mode: inputMode,
    commands,
    onInputChange: setInputValue,
    onModeChange: setInputMode,
    setPastedContents,
    setToolJSX,
    getToolUseContext,
    messages: messagesRef.current,
    mainLoopModel,
    pastedContents,
    ideSelection,
    setUserInputOnProcessing,
    setAbortController,
    abortController,
    onQuery,
    setAppState,
    querySource: getQuerySourceForREPL(),
    onBeforeQuery,
    canUseTool,
    addNotification,
    setMessages,
    streamMode: streamModeRef.current,
    hasInterruptibleToolInProgress: hasInterruptibleToolInProgressRef.current,
  });

  restoreDeferredReplStashedPrompt({
    shouldRestore: isSlashCommand || isLoading,
    stashedPrompt,
    setInputValue,
    helpers,
    setPastedContents,
    setStashedPrompt,
  });
}
