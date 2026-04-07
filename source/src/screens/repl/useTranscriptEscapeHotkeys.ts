import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Tools } from '../../Tool.js';
import { useInput } from '../../ink.js';
import { openFileInExternalEditor } from '../../utils/editor.js';
import { renderMessagesToPlainText } from '../../utils/exportRenderer.js';

type UseTranscriptEscapeHotkeysInput = {
  screen: 'prompt' | 'transcript'
  searchOpen: boolean
  dumpMode: boolean
  deferredMessages: Parameters<typeof renderMessagesToPlainText>[0]
  tools: Tools
  handleExitTranscript: () => void
  setDumpMode: Dispatch<SetStateAction<boolean>>
  setShowAllInTranscript: Dispatch<SetStateAction<boolean>>
  editorGenRef: RefObject<number>
  editorTimerRef: RefObject<ReturnType<typeof setTimeout> | undefined>
  editorRenderingRef: RefObject<boolean>
  setEditorStatus: Dispatch<SetStateAction<string>>
}

function matchesLiteralKey(
  input: string,
  key: { name?: string; sequence?: string; shift?: boolean },
  target: string,
): boolean {
  if (input === target) {
    return true
  }

  if (key.name === target || key.sequence === target) {
    return true
  }

  if (target.length === 1) {
    const lower = target.toLowerCase()
    const upper = target.toUpperCase()
    if (target === lower && key.name === lower && !key.shift) {
      return true
    }
    if (target === upper && key.name === lower && key.shift) {
      return true
    }
  }

  return false
}

export function useTranscriptEscapeHotkeys({
  screen,
  searchOpen,
  dumpMode,
  deferredMessages,
  tools,
  handleExitTranscript,
  setDumpMode,
  setShowAllInTranscript,
  editorGenRef,
  editorTimerRef,
  editorRenderingRef,
  setEditorStatus,
}: UseTranscriptEscapeHotkeysInput): void {
  useInput(
    (input, key, event) => {
      if (key.ctrl || key.meta) return;
      if (matchesLiteralKey(input, key, 'q')) {
        handleExitTranscript();
        event.stopImmediatePropagation();
        return;
      }

      if (matchesLiteralKey(input, key, '[') && !dumpMode) {
        setDumpMode(true);
        setShowAllInTranscript(true);
        event.stopImmediatePropagation();
      } else if (matchesLiteralKey(input, key, 'v')) {
        event.stopImmediatePropagation();
        if (editorRenderingRef.current) return;
        editorRenderingRef.current = true;
        const gen = editorGenRef.current;
        const setStatus = (status: string): void => {
          if (gen !== editorGenRef.current) return;
          clearTimeout(editorTimerRef.current);
          setEditorStatus(status);
        };
        setStatus(`rendering ${deferredMessages.length} messages…`);
        void (async () => {
          try {
            const width = Math.max(80, (process.stdout.columns ?? 80) - 6);
            const raw = await renderMessagesToPlainText(deferredMessages, tools, width);
            const text = raw.replace(/[ \t]+$/gm, '');
            const path = join(tmpdir(), `cc-transcript-${Date.now()}.txt`);
            await writeFile(path, text);
            const opened = openFileInExternalEditor(path);
            setStatus(opened ? `opening ${path}` : `wrote ${path} · no $VISUAL/$EDITOR set`);
          } catch (error) {
            setStatus(`render failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          editorRenderingRef.current = false;
          if (gen !== editorGenRef.current) return;
          editorTimerRef.current = setTimeout(nextSetEditorStatus => nextSetEditorStatus(''), 4000, setEditorStatus);
        })();
      }
    },
    {
      isActive: screen === 'transcript' && !searchOpen,
    },
  );
}
