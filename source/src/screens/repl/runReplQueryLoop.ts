import { resetTurnClassifierDuration, resetTurnHookDuration, resetTurnToolDuration } from '../../bootstrap/state.js';
import { queryCheckpoint } from '../../utils/queryProfiler.js';
import { query } from '../../query.js';

export async function runReplQueryLoop({
  messages,
  systemPrompt,
  userContext,
  systemContext,
  canUseTool,
  toolUseContext,
  onQueryEvent,
  querySource,
}: {
  messages: Parameters<typeof query>[0]['messages']
  systemPrompt: Parameters<typeof query>[0]['systemPrompt']
  userContext: Parameters<typeof query>[0]['userContext']
  systemContext: Parameters<typeof query>[0]['systemContext']
  canUseTool: Parameters<typeof query>[0]['canUseTool']
  toolUseContext: Parameters<typeof query>[0]['toolUseContext']
  onQueryEvent: (event: Parameters<typeof query>[0] extends never ? never : any) => void
  querySource: Parameters<typeof query>[0]['querySource']
}) {
  queryCheckpoint('query_query_start');
  resetTurnHookDuration();
  resetTurnToolDuration();
  resetTurnClassifierDuration();

  for await (const event of query({
    messages,
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    toolUseContext,
    querySource,
  })) {
    onQueryEvent(event);
  }

  queryCheckpoint('query_end');
}
