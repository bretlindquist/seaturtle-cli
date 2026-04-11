import { getOriginalCwd } from '../../bootstrap/state.js';
import { handleSpeculationAccept } from '../../services/PromptSuggestion/speculation.js';

export async function handleReplSpeculationAcceptance({
  speculationAccept,
  input,
  setMessages,
  readFileState,
  createAbortController,
  setAbortController,
  onQuery,
  mainLoopModel,
}: {
  speculationAccept?: {
    state: any;
    speculationSessionTimeSavedMs: number;
    setAppState: any;
  };
  input: string;
  setMessages: (updater: any) => void;
  readFileState: any;
  createAbortController: () => any;
  setAbortController: (value: any) => void;
  onQuery: (...args: any[]) => Promise<void>;
  mainLoopModel: any;
}): Promise<boolean> {
  if (!speculationAccept) {
    return false;
  }

  const { queryRequired } = await handleSpeculationAccept(
    speculationAccept.state,
    speculationAccept.speculationSessionTimeSavedMs,
    speculationAccept.setAppState,
    input,
    {
      setMessages,
      readFileState,
      cwd: getOriginalCwd(),
    },
  );

  if (queryRequired) {
    const newAbortController = createAbortController();
    setAbortController(newAbortController);
    void onQuery([], newAbortController, true, [], mainLoopModel);
  }

  return true;
}
