import { feature } from 'bun:bundle';
import { getOriginalCwd } from '../../bootstrap/state.js';
import { asSessionId } from '../../types/ids.js';
import { createSystemMessage } from '../../utils/messages.js';
import { deserializeMessages } from '../../utils/conversationRecovery.js';
import { getSessionEndHookTimeoutMs, executeSessionEndHooks } from '../../utils/hooks.js';
import { processSessionStartHooks } from '../../utils/sessionStart.js';
import { copyPlanForFork, copyPlanForResume } from '../../utils/plans.js';

export async function prepareReplSessionResume({
  sessionId,
  log,
  entrypoint,
  store,
  setAppState,
  mainThreadAgentDefinition,
  mainLoopModel,
}: {
  sessionId: any;
  log: any;
  entrypoint: any;
  store: any;
  setAppState: (updater: any) => void;
  mainThreadAgentDefinition: any;
  mainLoopModel: string;
}) {
  const messages = deserializeMessages(log.messages);

  if (feature('COORDINATOR_MODE')) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const coordinatorModule = require('../../coordinator/coordinatorMode.js') as typeof import('../../coordinator/coordinatorMode.js');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const warning = coordinatorModule.matchSessionMode(log.mode);
    if (warning) {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const {
        getAgentDefinitionsWithOverrides,
        getActiveAgentsFromList,
      } = require('../../tools/AgentTool/loadAgentsDir.js') as typeof import('../../tools/AgentTool/loadAgentsDir.js');
      /* eslint-enable @typescript-eslint/no-require-imports */
      getAgentDefinitionsWithOverrides.cache.clear?.();
      const freshAgentDefs = await getAgentDefinitionsWithOverrides(getOriginalCwd());
      setAppState((prev: any) => ({
        ...prev,
        agentDefinitions: {
          ...freshAgentDefs,
          allAgents: freshAgentDefs.allAgents,
          activeAgents: getActiveAgentsFromList(freshAgentDefs.allAgents),
        },
      }));
      messages.push(createSystemMessage(warning, 'warning'));
    }
  }

  const sessionEndTimeoutMs = getSessionEndHookTimeoutMs();
  await executeSessionEndHooks('resume', {
    getAppState: () => store.getState(),
    setAppState,
    signal: AbortSignal.timeout(sessionEndTimeoutMs),
    timeoutMs: sessionEndTimeoutMs,
  });

  const hookMessages = await processSessionStartHooks('resume', {
    sessionId,
    agentType: mainThreadAgentDefinition?.agentType,
    model: mainLoopModel,
  });
  messages.push(...hookMessages);

  if (entrypoint === 'fork') {
    void copyPlanForFork(log, asSessionId(sessionId));
  } else {
    void copyPlanForResume(log, asSessionId(sessionId));
  }

  return { messages };
}
