import { getMemoryFiles } from '../../utils/claudemd.js';
import { logForDebugging } from '../../utils/debug.js';

export async function initializeReplMemoryState(readFileState: { current: any }) {
  const memoryFiles = await getMemoryFiles();
  if (memoryFiles.length > 0) {
    const fileList = memoryFiles
      .map(
        file =>
          `  [${file.type}] ${file.path} (${file.content.length} chars)${file.parent ? ` (included by ${file.parent})` : ''}`,
      )
      .join('\n');
    logForDebugging(`Loaded ${memoryFiles.length} CLAUDE.md/rules files:\n${fileList}`);
  } else {
    logForDebugging('No CLAUDE.md/rules files found');
  }

  for (const file of memoryFiles) {
    readFileState.current.set(file.path, {
      content: file.contentDiffersFromDisk ? file.rawContent ?? file.content : file.content,
      timestamp: Date.now(),
      offset: undefined,
      limit: undefined,
      isPartialView: file.contentDiffersFromDisk,
    });
  }
}
