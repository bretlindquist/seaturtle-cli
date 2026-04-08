import { getSystemPrompt } from '../../constants/prompts.js';
import { buildEffectiveSystemPrompt } from '../../utils/systemPrompt.js';
import { getSystemContext, getUserContext } from '../../context.js';
import { getQueuedCommandAttachments, createAttachmentMessage } from '../../utils/attachments.js';
import { startBackgroundSession } from '../../tasks/LocalMainSessionTask.js';
import { getQuerySourceForREPL } from '../../utils/promptCategory.js';

export function startReplBackgroundQuery({
  abortController,
  removeByFilter,
  getToolUseContext,
  messagesRef,
  mainLoopModel,
  toolPermissionContext,
  mainThreadAgentDefinition,
  customSystemPrompt,
  appendSystemPrompt,
  canUseTool,
  terminalTitle,
  setAppState,
}: {
  abortController: AbortController | null;
  removeByFilter: (predicate: (cmd: any) => boolean) => any[];
  getToolUseContext: (...args: any[]) => any;
  messagesRef: { current: any[] };
  mainLoopModel: string;
  toolPermissionContext: any;
  mainThreadAgentDefinition: any;
  customSystemPrompt: any;
  appendSystemPrompt: any;
  canUseTool: (...args: any[]) => boolean;
  terminalTitle: string;
  setAppState: (updater: any) => void;
}) {
  abortController?.abort('background');
  const removedNotifications = removeByFilter(cmd => cmd.mode === 'task-notification');

  void (async () => {
    const toolUseContext = getToolUseContext(messagesRef.current, [], new AbortController(), mainLoopModel);
    const [defaultSystemPrompt, userContext, systemContext] = await Promise.all([
      getSystemPrompt(
        toolUseContext.options.tools,
        mainLoopModel,
        Array.from(toolPermissionContext.additionalWorkingDirectories.keys()),
        toolUseContext.options.mcpClients,
      ),
      getUserContext(),
      getSystemContext(),
    ]);
    const systemPrompt = buildEffectiveSystemPrompt({
      mainThreadAgentDefinition,
      toolUseContext,
      customSystemPrompt,
      defaultSystemPrompt,
      appendSystemPrompt,
    });
    toolUseContext.renderedSystemPrompt = systemPrompt;

    const notificationAttachments = await getQueuedCommandAttachments(removedNotifications).catch(() => []);
    const notificationMessages = notificationAttachments.map(createAttachmentMessage);

    const existingPrompts = new Set<string>();
    for (const message of messagesRef.current) {
      if (
        message.type === 'attachment' &&
        message.attachment.type === 'queued_command' &&
        message.attachment.commandMode === 'task-notification' &&
        typeof message.attachment.prompt === 'string'
      ) {
        existingPrompts.add(message.attachment.prompt);
      }
    }

    const uniqueNotifications = notificationMessages.filter(message =>
      message.attachment.type === 'queued_command' &&
      (typeof message.attachment.prompt !== 'string' || !existingPrompts.has(message.attachment.prompt)),
    );

    startBackgroundSession({
      messages: [...messagesRef.current, ...uniqueNotifications],
      queryParams: {
        systemPrompt,
        userContext,
        systemContext,
        canUseTool,
        toolUseContext,
        querySource: getQuerySourceForREPL(),
      },
      description: terminalTitle,
      setAppState,
      agentDefinition: mainThreadAgentDefinition,
    });
  })();
}
