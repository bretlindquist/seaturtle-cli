import { handlePromptSubmit } from '../../utils/handlePromptSubmit.js';
import { getAssistantMessageText } from '../../utils/messages.js';
import {
  haltQueueAutoProcessing,
  getCommandQueueLength,
} from '../../utils/messageQueueManager.js';
import { getQuerySourceForREPL } from '../../utils/promptCategory.js';

function shouldHaltQueueAfterQueuedTurn(messagesBeforeTurn: any[], messagesAfterTurn: any[]): boolean {
  const newAssistantMessages = messagesAfterTurn.filter(
    message =>
      message.type === 'assistant' &&
      !messagesBeforeTurn.some(existing => existing.uuid === message.uuid),
  )

  const lastAssistantMessage = newAssistantMessages.at(-1)
  if (!lastAssistantMessage?.isApiErrorMessage) {
    return false
  }

  const errorText = getAssistantMessageText(lastAssistantMessage)
  if (!errorText) {
    return true
  }

  return !/^API Error: Request was aborted\.?$/i.test(errorText.trim())
}

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
  const messagesBeforeTurn = messages

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
  })

  let messagesAfterTurn = messagesBeforeTurn
  setMessages((prev: any[]) => {
    messagesAfterTurn = prev
    return prev
  })

  if (shouldHaltQueueAfterQueuedTurn(messagesBeforeTurn, messagesAfterTurn)) {
    haltQueueAutoProcessing()
    if (getCommandQueueLength() > 0) {
      addNotification({
        key: 'queued-prompts-preserved-after-api-error',
        text: 'API error stopped queue progression. Remaining queued prompts were preserved.',
        priority: 'high',
      })
    }
  }
}
