import { initializeReplMemoryState } from './initializeReplMemoryState.js';

export async function runReplStartupInitialization({
  reverify,
  readFileState,
}: {
  reverify: () => void;
  readFileState: { current: unknown };
}) {
  void reverify();
  await initializeReplMemoryState(readFileState);
}
