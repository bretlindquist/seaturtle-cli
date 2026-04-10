import { getCtConversationPostureResult } from '../../services/projectIdentity/conversationPosture.js';
import { getCtContextDomainResult } from '../../services/projectIdentity/contextDomain.js';
import type { EditablePromptInputMode } from '../../types/textInputTypes.js';
import { logError } from '../../utils/log.js';
import { getReplInputModeGuidance } from './replInputModeGuidance.js';

export function buildReplTurnAppendSystemPrompt({
  appendSystemPrompt,
  currentInput,
  inputMode,
  recentUserMessages,
  cwd,
  messageCount,
}: {
  appendSystemPrompt: string | undefined
  currentInput: string
  inputMode?: EditablePromptInputMode
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
    const inputModeGuidance = getReplInputModeGuidance(inputMode);
    const turnAddendum = [
      inputModeGuidance,
      contextDomain.addendum,
      conversationPosture.addendum,
    ]
      .filter(Boolean)
      .join('\n\n');
    effectiveAppendSystemPrompt = appendSystemPrompt
      ? `${appendSystemPrompt}\n\n${turnAddendum}`
      : turnAddendum;
  } catch (error) {
    logError(error);
  }

  return effectiveAppendSystemPrompt;
}
