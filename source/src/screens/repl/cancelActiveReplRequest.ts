import { feature } from 'bun:bundle';
import { snapshotOutputTokensForTurn } from '../../bootstrap/state.js';
import { createAssistantMessage, type Message as MessageType } from '../../utils/messages.js';

export function cancelActiveReplRequest({
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
  pauseProactive,
}: {
  focusedInputDialog: string | null;
  queryGuard: { forceEnd: () => void };
  skipIdleCheckRef: { current: boolean };
  streamingText: string | null;
  setMessages: (updater: (prev: MessageType[]) => MessageType[]) => void;
  resetLoadingState: () => void;
  toolUseConfirmQueue: Array<{ onAbort?: () => void }>;
  setToolUseConfirmQueue: (queue: []) => void;
  promptQueue: Array<{ reject: (error: Error) => void }>;
  setPromptQueue: (queue: []) => void;
  activeRemote: { isRemoteMode: boolean; cancelRequest: () => void };
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
  messagesRef: { current: MessageType[] };
  mrOnTurnComplete: (messages: MessageType[], aborted: boolean) => Promise<void> | void;
  pauseProactive: () => void;
}) {
  if (focusedInputDialog === 'elicitation') {
    return;
  }

  pauseProactive();
  queryGuard.forceEnd();
  skipIdleCheckRef.current = false;

  if (streamingText?.trim()) {
    setMessages(prev => [
      ...prev,
      createAssistantMessage({
        content: streamingText,
      }),
    ]);
  }
  resetLoadingState();

  if (feature('TOKEN_BUDGET')) {
    snapshotOutputTokensForTurn(null);
  }

  if (focusedInputDialog === 'tool-permission') {
    toolUseConfirmQueue[0]?.onAbort?.();
    setToolUseConfirmQueue([]);
  } else if (focusedInputDialog === 'prompt') {
    for (const item of promptQueue) {
      item.reject(new Error('Prompt cancelled by user'));
    }
    setPromptQueue([]);
    abortController?.abort('user-cancel');
  } else if (activeRemote.isRemoteMode) {
    activeRemote.cancelRequest();
  } else {
    abortController?.abort('user-cancel');
  }

  setAbortController(null);
  void mrOnTurnComplete(messagesRef.current, true);
}
