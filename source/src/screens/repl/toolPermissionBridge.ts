export function createSetReplToolPermissionContext({
  setAppState,
  setToolUseConfirmQueue,
}: {
  setAppState: (updater: any) => void;
  setToolUseConfirmQueue: (updater: any) => void;
}) {
  return (context: any, options?: { preserveMode?: boolean }) => {
    setAppState((prev: any) => ({
      ...prev,
      toolPermissionContext: {
        ...context,
        mode: options?.preserveMode ? prev.toolPermissionContext.mode : context.mode,
      },
    }));

    setImmediate((setQueue: any) => {
      setQueue((currentQueue: any[]) => {
        currentQueue.forEach(item => {
          void item.recheckPermission();
        });
        return currentQueue;
      });
    }, setToolUseConfirmQueue);
  };
}

export function createReplPromptRequester({
  setPromptQueue,
}: {
  setPromptQueue: (updater: any) => void;
}) {
  return (title: string, toolInputSummary?: string | null) => (request: any) =>
    new Promise((resolve, reject) => {
      setPromptQueue((prev: any[]) => [
        ...prev,
        {
          request,
          title,
          toolInputSummary,
          resolve,
          reject,
        },
      ]);
    });
}
