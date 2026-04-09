import { extractBashToolsFromMessages, extractReadFilesFromMessages } from '../../utils/queryHelpers.js';
import { mergeFileStateCaches, READ_FILE_STATE_CACHE_SIZE } from '../../utils/fileStateCache.js';

export function restoreReplReadFileState({
  messages,
  cwd,
  readFileState,
  bashTools,
}: {
  messages: any[];
  cwd: string;
  readFileState: { current: any };
  bashTools: { current: Set<string> };
}) {
  const extracted = extractReadFilesFromMessages(messages, cwd, READ_FILE_STATE_CACHE_SIZE);
  readFileState.current = mergeFileStateCaches(readFileState.current, extracted);
  for (const tool of extractBashToolsFromMessages(messages)) {
    bashTools.current.add(tool);
  }
}
