import { popNextEditable } from '../../utils/messageQueueManager.js';
import type { PastedContent } from '../../utils/config.js';

export function restoreQueuedCancelInput({
  inputValue,
  setInputValue,
  setInputMode,
  setPastedContents,
}: {
  inputValue: string
  setInputValue: (value: string) => void
  setInputMode: (mode: 'prompt') => void
  setPastedContents: React.Dispatch<
    React.SetStateAction<Record<string, PastedContent>>
  >
}) {
  const result = popNextEditable(inputValue, 0);
  if (!result) return;

  setInputValue(result.text);
  setInputMode('prompt');

  if (result.images.length === 0) {
    return;
  }

  setPastedContents(prev => {
    const next = { ...prev };
    for (const image of result.images) {
      next[image.id] = image;
    }
    return next;
  });
}
