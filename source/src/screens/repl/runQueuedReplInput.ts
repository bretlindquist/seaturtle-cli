import { executeReplQueuedInput } from './executeReplQueuedInput.js';

export async function runQueuedReplInput({
  queuedCommands,
  executeArgs,
}: {
  queuedCommands: any[]
  executeArgs: Omit<
    Parameters<typeof executeReplQueuedInput>[0],
    'queuedCommands'
  >
}) {
  await executeReplQueuedInput({
    ...executeArgs,
    queuedCommands,
  });
}
