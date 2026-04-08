import { getCtConversationPostureResult } from '../../services/projectIdentity/conversationPosture.js';
import { getCtContextDomainResult } from '../../services/projectIdentity/contextDomain.js';
import { logError } from '../../utils/log.js';

export function buildReplTurnAppendSystemPrompt({
  appendSystemPrompt,
  currentInput,
  recentUserMessages,
  cwd,
  messageCount,
}: {
  appendSystemPrompt: string | undefined
  currentInput: string
  recentUserMessages: string[]
  cwd: string
  messageCount: number
}) {
  let effectiveAppendSystemPrompt = appendSystemPrompt;

  try {
    const conversationPosture = getCtConversationPostureResult({
      currentInput,
      recentUserMessages,
      seed: `${cwd}:${currentInput}:${messageCount}`,
    });
    const contextDomain = getCtContextDomainResult({
      cwd,
      currentInput,
      recentUserMessages,
    });
    const turnAddendum = `${contextDomain.addendum}\n\n${conversationPosture.addendum}`;
    effectiveAppendSystemPrompt = appendSystemPrompt
      ? `${appendSystemPrompt}\n\n${turnAddendum}`
      : turnAddendum;
  } catch (error) {
    logError(error);
  }

  return effectiveAppendSystemPrompt;
}
