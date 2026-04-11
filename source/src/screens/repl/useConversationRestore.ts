import { useCallback } from 'react';
import { randomUUID } from 'crypto';
import type { ImageBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs';
import type { PastedContent } from '../../utils/config.js';
import type { SetAppState } from '../../utils/messageQueueManager.js';
import type { UserMessage } from '../../types/message.js';
import { logEvent } from '../../services/analytics/index.js';
import { resetMicrocompactState } from '../../services/compact/microCompact.js';
import { textForResubmit } from '../../utils/messages.js';
import { messagesAfterAreOnlySynthetic } from '../../components/MessageSelector.js';
import { fileHistoryHasAnyChanges, type FileHistoryState } from '../../utils/fileHistory.js';

type UseConversationRestoreInput = {
  messagesRef: React.RefObject<UserMessage[] | readonly any[]>
  messages: readonly any[]
  setMessages: (messages: any[]) => void
  setConversationId: (id: string) => void
  setAppState: SetAppState
  setInputValue: (value: string) => void
  setInputMode: (mode: any) => void
  setPastedContents: (contents: Record<number, PastedContent>) => void
  fileHistory: FileHistoryState
  onCancel: () => void
  setMessageSelectorPreselect: (message: UserMessage) => void
  setIsMessageSelectorVisible: (visible: boolean) => void
  contextCollapseEnabled: boolean
}

function resetContextCollapseIfNeeded(enabled: boolean) {
  if (!enabled) return;
  /* eslint-disable @typescript-eslint/no-require-imports */
  (require('../../services/contextCollapse/index.js') as typeof import('../../services/contextCollapse/index.js')).resetContextCollapse();
  /* eslint-enable @typescript-eslint/no-require-imports */
}

export function useConversationRestore({
  messagesRef,
  messages,
  setMessages,
  setConversationId,
  setAppState,
  setInputValue,
  setInputMode,
  setPastedContents,
  fileHistory,
  onCancel,
  setMessageSelectorPreselect,
  setIsMessageSelectorVisible,
  contextCollapseEnabled,
}: UseConversationRestoreInput) {
  const rewindConversationTo = useCallback((message: UserMessage) => {
    const prev = messagesRef.current;
    const messageIndex = prev.lastIndexOf(message);
    if (messageIndex === -1) return;
    logEvent('tengu_conversation_rewind', {
      preRewindMessageCount: prev.length,
      postRewindMessageCount: messageIndex,
      messagesRemoved: prev.length - messageIndex,
      rewindToMessageIndex: messageIndex
    });
    setMessages(prev.slice(0, messageIndex));
    setConversationId(randomUUID());
    resetMicrocompactState();
    resetContextCollapseIfNeeded(contextCollapseEnabled);
    setAppState(prevState => ({
      ...prevState,
      toolPermissionContext: message.permissionMode && prevState.toolPermissionContext.mode !== message.permissionMode ? {
        ...prevState.toolPermissionContext,
        mode: message.permissionMode
      } : prevState.toolPermissionContext,
      promptSuggestion: {
        text: null,
        promptId: null,
        shownAt: 0,
        acceptedAt: 0,
        generationRequestId: null
      }
    }));
  }, [contextCollapseEnabled, messagesRef, setAppState, setConversationId, setMessages]);

  const restoreMessageSync = useCallback((message: UserMessage) => {
    rewindConversationTo(message);
    const r = textForResubmit(message);
    if (r) {
      setInputValue(r.text);
      setInputMode(r.mode);
    }
    if (Array.isArray(message.message.content) && message.message.content.some(block => block.type === 'image')) {
      const imageBlocks: Array<ImageBlockParam> = message.message.content.filter(block => block.type === 'image');
      if (imageBlocks.length > 0) {
        const newPastedContents: Record<number, PastedContent> = {};
        imageBlocks.forEach((block, index) => {
          if (block.source.type === 'base64') {
            const id = message.imagePasteIds?.[index] ?? index + 1;
            newPastedContents[id] = {
              id,
              type: 'image',
              content: block.source.data,
              mediaType: block.source.media_type
            };
          }
        });
        setPastedContents(newPastedContents);
      }
    }
  }, [rewindConversationTo, setInputMode, setInputValue, setPastedContents]);

  const handleRestoreMessage = useCallback(async (message: UserMessage) => {
    setImmediate((restore, m) => restore(m), restoreMessageSync, message);
  }, [restoreMessageSync]);

  const findRawIndex = useCallback((uuid: string) => {
    const prefix = uuid.slice(0, 24);
    return messages.findIndex(m => m.uuid.slice(0, 24) === prefix);
  }, [messages]);

  const editMessage = useCallback(async (msg: UserMessage) => {
    const rawIdx = findRawIndex(msg.uuid);
    const raw = rawIdx >= 0 ? messages[rawIdx] : undefined;
    if (!raw || raw.type !== 'user' || raw.isMeta || raw.isVisibleInTranscriptOnly) return;
    const noFileChanges = !(await fileHistoryHasAnyChanges(fileHistory, raw.uuid));
    const onlySynthetic = messagesAfterAreOnlySynthetic(messages, rawIdx);
    if (noFileChanges && onlySynthetic) {
      onCancel();
      void handleRestoreMessage(raw);
    } else {
      setMessageSelectorPreselect(raw);
      setIsMessageSelectorVisible(true);
    }
  }, [fileHistory, findRawIndex, handleRestoreMessage, messages, onCancel, setIsMessageSelectorVisible, setMessageSelectorPreselect]);

  return {
    rewindConversationTo,
    restoreMessageSync,
    handleRestoreMessage,
    findRawIndex,
    editMessage,
  };
}
