import { handlePromptSubmit } from '../../utils/handlePromptSubmit.js';
import { getQuerySourceForREPL } from '../../utils/promptCategory.js';

export async function executeReplQueuedInput({
  queuedCommands,
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
  queuedCommands: any[];
  queryGuard: any;
  commands: any[];
  setToolJSX: (value: any) => void;
  getToolUseContext: (...args: any[]) => any;
  messages: any[];
  mainLoopModel: any;
  ideSelection: any;
  setUserInputOnProcessing: (value: string | null) => void;
  setAbortController: (value: any) => void;
  onQuery: (...args: any[]) => Promise<void>;
  setAppState: (updater: any) => void;
  onBeforeQuery: (...args: any[]) => Promise<void> | void;
  canUseTool: (...args: any[]) => boolean;
  addNotification: (value: any) => void;
  setMessages: (updater: any) => void;
}) {
  await handlePromptSubmit({
    helpers: {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {},
    },
    queryGuard,
    commands,
    onInputChange: () => {},
    onModeChange: () => {},
    setPastedContents: () => {},
    setToolJSX,
    getToolUseContext,
    messages,
    mainLoopModel,
    ideSelection,
    setUserInputOnProcessing,
    setAbortController,
    onQuery,
    setAppState,
    querySource: getQuerySourceForREPL(),
    onBeforeQuery,
    canUseTool,
    addNotification,
    setMessages,
    queuedCommands,
  });
}
