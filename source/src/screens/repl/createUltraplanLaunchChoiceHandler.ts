import type * as React from 'react';
import type { SetAppState } from '../../utils/messageQueueManager.js';
import { QueryGuard } from '../../utils/QueryGuard.js';
import { launchUltraplan } from '../../commands/ultraplan.js';
import { createCommandInputMessage, formatCommandInputTags } from '../../utils/messages.js';
import { LOCAL_COMMAND_STDOUT_TAG } from '../../constants/xml.js';
import { escapeXml } from '../../utils/xml.js';
import { logError } from '../../utils/log.js';

type UltraplanLaunchChoice = 'cancel' | string

type CreateUltraplanLaunchChoiceHandlerArgs = {
  blurb: string
  setAppState: SetAppState
  setMessages: React.Dispatch<React.SetStateAction<any[]>>
  queryGuard: QueryGuard
  getAppState: () => any
  createAbortSignal: () => AbortSignal
}

export function createUltraplanLaunchChoiceHandler({
  blurb,
  setAppState,
  setMessages,
  queryGuard,
  getAppState,
  createAbortSignal,
}: CreateUltraplanLaunchChoiceHandlerArgs) {
  return (choice: UltraplanLaunchChoice, opts?: { disconnectedBridge?: boolean }) => {
    setAppState(prev => prev.ultraplanLaunchPending ? {
      ...prev,
      ultraplanLaunchPending: undefined
    } : prev);

    if (choice === 'cancel') {
      return;
    }

    setMessages(prev => [
      ...prev,
      createCommandInputMessage(formatCommandInputTags('ultraplan', blurb))
    ]);

    const appendStdout = (msg: string) => {
      setMessages(prev => [
        ...prev,
        createCommandInputMessage(
          `<${LOCAL_COMMAND_STDOUT_TAG}>${escapeXml(msg)}</${LOCAL_COMMAND_STDOUT_TAG}>`,
        )
      ]);
    };

    const appendWhenIdle = (msg: string) => {
      if (!queryGuard.isActive) {
        appendStdout(msg);
        return;
      }

      const unsub = queryGuard.subscribe(() => {
        if (queryGuard.isActive) return;
        unsub();
        if (!getAppState().ultraplanSessionUrl) return;
        appendStdout(msg);
      });
    };

    void launchUltraplan({
      blurb,
      getAppState,
      setAppState,
      signal: createAbortSignal(),
      disconnectedBridge: opts?.disconnectedBridge,
      onSessionReady: appendWhenIdle,
    }).then(appendStdout).catch(logError);
  };
}
