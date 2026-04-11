import { useCallback } from 'react';
import { feature } from 'bun:bundle';
import { randomUUID } from 'crypto';
import type { UserMessage, PartialCompactDirection } from '../../types/message.js';
import type { FileHistoryState } from '../../utils/fileHistory.js';
import { fileHistoryRewind } from '../../utils/fileHistory.js';
import { getMessagesAfterCompactBoundary, textForResubmit, createSystemMessage } from '../../utils/messages.js';
import { createAbortController } from '../../utils/abortController.js';
import { getSystemPrompt } from '../../constants/prompts.js';
import { getSystemContext, getUserContext } from '../../context.js';
import { buildEffectiveSystemPrompt } from '../../utils/systemPrompt.js';
import { partialCompactConversation } from '../../services/compact/compact.js';
import { runPostCompactCleanup } from '../../services/compact/postCompactCleanup.js';
import { getShortcutDisplay } from '../../keybindings/shortcutFormat.js';
import { isFullscreenEnvEnabled } from '../../utils/fullscreen.js';

type UseMessageSelectorActionsInput = {
  messages: readonly UserMessage[]
  setMessages: (updater: UserMessage[] | ((prev: UserMessage[]) => UserMessage[])) => void
  setAppState: (updater: (prev: any) => any) => void
  getToolUseContext: (messages: any[], newMessages: any[], abortController: AbortController, mainLoopModel: string) => any
  mainLoopModel: string
  setConversationId: (id: string) => void
  setInputValue: (value: string) => void
  setInputMode: (mode: any) => void
  addNotification: (notification: {
    key: string
    text: string
    priority: 'medium' | 'immediate' | 'low'
    timeoutMs: number
  }) => void
  setIsMessageSelectorVisible: (visible: boolean) => void
  setMessageSelectorPreselect: (message: UserMessage | undefined) => void
}

export function useMessageSelectorActions({
  messages,
  setMessages,
  setAppState,
  getToolUseContext,
  mainLoopModel,
  setConversationId,
  setInputValue,
  setInputMode,
  addNotification,
  setIsMessageSelectorVisible,
  setMessageSelectorPreselect,
}: UseMessageSelectorActionsInput) {
  const handleRestoreCode = useCallback(async (message: UserMessage) => {
    await fileHistoryRewind((updater: (prev: FileHistoryState) => FileHistoryState) => {
      setAppState(prev => ({
        ...prev,
        fileHistory: updater(prev.fileHistory)
      }));
    }, message.uuid);
  }, [setAppState]);

  const handleSummarize = useCallback(async (message: UserMessage, feedback?: string, direction: PartialCompactDirection = 'from') => {
    const compactMessages = getMessagesAfterCompactBoundary(messages);
    const messageIndex = compactMessages.indexOf(message);
    if (messageIndex === -1) {
      setMessages(prev => [...prev, createSystemMessage('That message is no longer in the active context (snipped or pre-compact). Choose a more recent message.', 'warning')]);
      return;
    }

    const newAbortController = createAbortController();
    const context = getToolUseContext(compactMessages, [], newAbortController, mainLoopModel);
    const appState = context.getAppState();
    const defaultSysPrompt = await getSystemPrompt(context.options.tools, context.options.mainLoopModel, Array.from(appState.toolPermissionContext.additionalWorkingDirectories.keys()), context.options.mcpClients);
    const systemPrompt = buildEffectiveSystemPrompt({
      mainThreadAgentDefinition: undefined,
      toolUseContext: context,
      customSystemPrompt: context.options.customSystemPrompt,
      defaultSystemPrompt: defaultSysPrompt,
      appendSystemPrompt: context.options.appendSystemPrompt
    });
    const [userContext, systemContext] = await Promise.all([getUserContext(), getSystemContext()]);
    const result = await partialCompactConversation(compactMessages, messageIndex, context, {
      systemPrompt,
      userContext,
      systemContext,
      toolUseContext: context,
      forkContextMessages: compactMessages
    }, feedback, direction);
    const kept = result.messagesToKeep ?? [];
    const ordered = direction === 'up_to' ? [...result.summaryMessages, ...kept] : [...kept, ...result.summaryMessages];
    const postCompact = [result.boundaryMarker, ...ordered, ...result.attachments, ...result.hookResults];

    if (isFullscreenEnvEnabled() && direction === 'from') {
      setMessages(old => {
        const rawIdx = old.findIndex(m => m.uuid === message.uuid);
        return [...old.slice(0, rawIdx === -1 ? 0 : rawIdx), ...postCompact];
      });
    } else {
      setMessages(postCompact);
    }

    if (feature('PROACTIVE') || feature('KAIROS')) {
      const proactiveModule = require('../../proactive/index.js') as typeof import('../../proactive/index.js');
      proactiveModule?.setContextBlocked(false);
    }

    setConversationId(randomUUID());
    runPostCompactCleanup(context.options.querySource);

    if (direction === 'from') {
      const r = textForResubmit(message);
      if (r) {
        setInputValue(r.text);
        setInputMode(r.mode);
      }
    }

    const historyShortcut = getShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o');
    addNotification({
      key: 'summarize-ctrl-o-hint',
      text: `Conversation summarized (${historyShortcut} for history)`,
      priority: 'medium',
      timeoutMs: 8000
    });
  }, [addNotification, getToolUseContext, mainLoopModel, messages, setConversationId, setInputMode, setInputValue, setMessages]);

  const closeMessageSelector = useCallback(() => {
    setIsMessageSelectorVisible(false);
    setMessageSelectorPreselect(undefined);
  }, [setIsMessageSelectorVisible, setMessageSelectorPreselect]);

  return {
    handleRestoreCode,
    handleSummarize,
    closeMessageSelector,
  };
}
