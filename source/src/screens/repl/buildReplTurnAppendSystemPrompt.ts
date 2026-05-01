import { getCtConversationPostureResult } from '../../services/projectIdentity/conversationPosture.js';
import { getCtContextDomainResult } from '../../services/projectIdentity/contextDomain.js';
import { resolveAutoworkExecutionPosture } from '../../services/autowork/executionPosture.js';
import type { WorkflowRuntimeSnapshot } from '../../services/projectIdentity/workflowRuntime.js';
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
  workflowRuntime,
}: {
  appendSystemPrompt: string | undefined
  currentInput: string
  inputMode?: EditablePromptInputMode
  recentUserMessages: string[]
  cwd: string
  messageCount: number
  workflowRuntime?: WorkflowRuntimeSnapshot | null
}) {
  let effectiveAppendSystemPrompt = appendSystemPrompt;

  try {
    const autoworkExecutionPosture = resolveAutoworkExecutionPosture({
      currentInput,
      workflowRuntime,
    });
    const conversationPosture = autoworkExecutionPosture.active
      ? null
      : getCtConversationPostureResult({
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
      autoworkExecutionPosture.addendum ?? conversationPosture?.addendum,
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
