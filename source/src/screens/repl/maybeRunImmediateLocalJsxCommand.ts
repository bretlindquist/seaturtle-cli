import { getCommandName, isCommandEnabled } from '../../commands.js';
import { expandPastedTextRefs, parseReferences } from '../../history.js';
import { logForDebugging } from '../../utils/debug.js';
import { errorMessage } from '../../utils/errors.js';
import {
  createCommandInputMessage,
  createUserMessage,
  formatCommandInputTags,
} from '../../utils/messages.js';
import { escapeXml } from '../../utils/xml.js';
import { LOCAL_COMMAND_STDOUT_TAG } from '../../constants/xml.js';
import { logEvent } from 'src/services/analytics/index.js';
import { getTotalInputTokens } from '../../bootstrap/state.js';

export async function maybeRunImmediateLocalJsxCommand({
  input,
  options,
  speculationAccept,
  pastedContents,
  commands,
  idleHintShownRef,
  lastQueryCompletionTimeRef,
  messagesRef,
  queryGuard,
  inputValueRef,
  setInputValue,
  helpers,
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
}: {
  input: string;
  options?: { fromKeybinding?: boolean };
  speculationAccept?: unknown;
  pastedContents: Record<string, any>;
  commands: any[];
  idleHintShownRef: { current: string | false | null | undefined };
  lastQueryCompletionTimeRef: { current: number };
  messagesRef: { current: any[] };
  queryGuard: { isActive: boolean };
  inputValueRef: { current: string };
  setInputValue: (value: string) => void;
  helpers: {
    setCursorOffset: (value: number) => void;
    clearBuffer: () => void;
  };
  setPastedContents: (value: any) => void;
  setToolJSX: (value: any) => void;
  addNotification: (value: any) => void;
  isFullscreenEnvEnabled: () => boolean;
  setMessages: (updater: any) => void;
  stashedPrompt: any;
  setStashedPrompt: (value: any) => void;
  getToolUseContext: (...args: any[]) => any;
  createAbortController: () => any;
  mainLoopModel: any;
}): Promise<boolean> {
  if (speculationAccept || !input.trim().startsWith('/')) {
    return false;
  }

  const trimmedInput = expandPastedTextRefs(input, pastedContents).trim();
  const spaceIndex = trimmedInput.indexOf(' ');
  const commandName = spaceIndex === -1 ? trimmedInput.slice(1) : trimmedInput.slice(1, spaceIndex);
  const commandArgs = spaceIndex === -1 ? '' : trimmedInput.slice(spaceIndex + 1).trim();
  const matchingCommand = commands.find(command => isCommandEnabled(command) && (command.name === commandName || command.aliases?.includes(commandName) || getCommandName(command) === commandName));

  if (matchingCommand?.name === 'clear' && idleHintShownRef.current) {
    logEvent('tengu_idle_return_action', {
      action: 'hint_converted',
      variant: idleHintShownRef.current,
      idleMinutes: Math.round((Date.now() - lastQueryCompletionTimeRef.current) / 60_000),
      messageCount: messagesRef.current.length,
      totalInputTokens: getTotalInputTokens(),
    });
    idleHintShownRef.current = false;
  }

  const shouldTreatAsImmediate = queryGuard.isActive && (matchingCommand?.immediate || options?.fromKeybinding);
  if (!(matchingCommand && shouldTreatAsImmediate && matchingCommand.type === 'local-jsx')) {
    return false;
  }

  if (input.trim() === inputValueRef.current.trim()) {
    setInputValue('');
    helpers.setCursorOffset(0);
    helpers.clearBuffer();
    setPastedContents({});
  }

  const pastedTextRefs = parseReferences(input).filter(reference => pastedContents[reference.id]?.type === 'text');
  const pastedTextCount = pastedTextRefs.length;
  const pastedTextBytes = pastedTextRefs.reduce((sum, reference) => sum + (pastedContents[reference.id]?.content.length ?? 0), 0);
  logEvent('tengu_paste_text', {
    pastedTextCount,
    pastedTextBytes,
  });
  logEvent('tengu_immediate_command_executed', {
    commandName: matchingCommand.name,
    fromKeybinding: options?.fromKeybinding ?? false,
  });

  const executeImmediateCommand = async (): Promise<void> => {
    let doneWasCalled = false;
    const onDone = (result?: string, doneOptions?: {
      display?: string;
      metaMessages?: string[];
    }): void => {
      doneWasCalled = true;
      setToolJSX({
        jsx: null,
        shouldHidePromptInput: false,
        clearLocalJSX: true,
      });

      const newMessages: any[] = [];
      if (result && doneOptions?.display !== 'skip') {
        addNotification({
          key: `immediate-${matchingCommand.name}`,
          text: result,
          priority: 'immediate',
        });
        if (!isFullscreenEnvEnabled()) {
          newMessages.push(
            createCommandInputMessage(formatCommandInputTags(getCommandName(matchingCommand), commandArgs)),
            createCommandInputMessage(`<${LOCAL_COMMAND_STDOUT_TAG}>${escapeXml(result)}</${LOCAL_COMMAND_STDOUT_TAG}>`),
          );
        }
      }

      if (doneOptions?.metaMessages?.length) {
        newMessages.push(...doneOptions.metaMessages.map(content => createUserMessage({
          content,
          isMeta: true,
        })));
      }

      if (newMessages.length) {
        setMessages((prev: any[]) => [...prev, ...newMessages]);
      }

      if (stashedPrompt !== undefined) {
        setInputValue(stashedPrompt.text);
        helpers.setCursorOffset(stashedPrompt.cursorOffset);
        setPastedContents(stashedPrompt.pastedContents);
        setStashedPrompt(undefined);
      }
    };

    const context = getToolUseContext(messagesRef.current, [], createAbortController(), mainLoopModel);
    const mod = await matchingCommand.load();
    const jsx = await mod.call(onDone, context, commandArgs);

    if (jsx && !doneWasCalled) {
      setToolJSX({
        jsx,
        shouldHidePromptInput: false,
        isLocalJSXCommand: true,
      });
    }
  };

  void executeImmediateCommand().catch(error => {
    logForDebugging(`Immediate local-jsx command failed: ${errorMessage(error)}`);
  });
  return true;
}
