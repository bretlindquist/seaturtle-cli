import {
  BASH_INPUT_TAG,
  COMMAND_MESSAGE_TAG,
  COMMAND_NAME_TAG,
  LOCAL_COMMAND_STDOUT_TAG,
} from '../../constants/xml.js';

type MessageLike = {
  type: string
  isMeta?: boolean
  message?: {
    content: unknown
  }
}

type SetAppStateLike = (updater: (prev: any) => any) => void

export function maybeGenerateFirstQuerySessionTitle({
  newMessages,
  titleDisabled,
  sessionTitle,
  agentTitle,
  haikuTitleAttemptedRef,
  getContentText,
  generateSessionTitle,
  setHaikuTitle,
}: {
  newMessages: MessageLike[]
  titleDisabled: boolean
  sessionTitle: string | undefined
  agentTitle: string | null | undefined
  haikuTitleAttemptedRef: React.RefObject<boolean>
  getContentText: (content: unknown) => string | null
  generateSessionTitle: (text: string, signal: AbortSignal) => Promise<string | null | undefined>
  setHaikuTitle: (title: string) => void
}) {
  if (
    titleDisabled ||
    sessionTitle ||
    agentTitle ||
    haikuTitleAttemptedRef.current
  ) {
    return;
  }

  const firstUserMessage = newMessages.find(
    (message): message is MessageLike =>
      message.type === 'user' && !message.isMeta,
  );
  const text =
    firstUserMessage?.type === 'user' && firstUserMessage.message
      ? getContentText(firstUserMessage.message.content)
      : null;

  if (
    !text ||
    text.startsWith(`<${LOCAL_COMMAND_STDOUT_TAG}>`) ||
    text.startsWith(`<${COMMAND_MESSAGE_TAG}>`) ||
    text.startsWith(`<${COMMAND_NAME_TAG}>`) ||
    text.startsWith(`<${BASH_INPUT_TAG}>`)
  ) {
    return;
  }

  haikuTitleAttemptedRef.current = true;
  void generateSessionTitle(text, new AbortController().signal).then(
    title => {
      if (title) {
        setHaikuTitle(title);
      } else {
        haikuTitleAttemptedRef.current = false;
      }
    },
    () => {
      haikuTitleAttemptedRef.current = false;
    },
  );
}

export function syncTurnAllowedTools({
  setAppState,
  additionalAllowedTools,
}: {
  setAppState: SetAppStateLike
  additionalAllowedTools: string[]
}) {
  setAppState(prev => {
    const current = prev.toolPermissionContext.alwaysAllowRules.command;
    if (
      current === additionalAllowedTools ||
      (current?.length === additionalAllowedTools.length &&
        current.every((value: string, index: number) => value === additionalAllowedTools[index]))
    ) {
      return prev;
    }

    return {
      ...prev,
      toolPermissionContext: {
        ...prev.toolPermissionContext,
        alwaysAllowRules: {
          ...prev.toolPermissionContext.alwaysAllowRules,
          command: additionalAllowedTools,
        },
      },
    };
  });
}
