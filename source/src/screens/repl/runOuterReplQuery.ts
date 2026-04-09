import { finalizeCompletedOuterReplQuery, maybeRestoreCanceledOuterReplQuery } from './finalizeOuterReplQuery.js';
import { handleConcurrentReplQuery, prepareReplQueryAttempt } from './prepareReplQueryAttempt.js';

export async function runOuterReplQuery<TMessage>({
  newMessages,
  abortController,
  shouldQuery,
  additionalAllowedTools,
  mainLoopModelParam,
  onQueryImpl,
  queryGuard,
  getContentText,
  input,
  effort,
  prepareArgs,
  finalizeArgs,
  restoreCanceledArgs,
}: {
  newMessages: TMessage[]
  abortController: AbortController
  shouldQuery: boolean
  additionalAllowedTools: string[]
  mainLoopModelParam: string
  onQueryImpl: (
    latestMessages: TMessage[],
    newMessages: TMessage[],
    abortController: AbortController,
    shouldQuery: boolean,
    additionalAllowedTools: string[],
    mainLoopModelParam: string,
    input?: string,
    effort?: unknown,
  ) => Promise<void>
  queryGuard: {
    tryStart: () => number | null
    end: (generation: number) => boolean
    isActive: boolean
  }
  getContentText: (content: unknown) => string | null
  input?: string
  effort?: unknown
  prepareArgs: Omit<
    Parameters<typeof prepareReplQueryAttempt<TMessage>>[0],
    'newMessages' | 'input'
  >
  finalizeArgs: Omit<
    Parameters<typeof finalizeCompletedOuterReplQuery>[0],
    'abortController'
  >
  restoreCanceledArgs: Omit<
    Parameters<typeof maybeRestoreCanceledOuterReplQuery>[0],
    'abortController' | 'queryIsActive' | 'inputValue'
  > & {
    inputValue: string
  }
}) {
  const thisGeneration = queryGuard.tryStart();
  if (thisGeneration === null) {
    handleConcurrentReplQuery({
      newMessages,
      getContentText,
    });
    return;
  }

  try {
    const { shouldProceed, latestMessages } = await prepareReplQueryAttempt({
      ...prepareArgs,
      newMessages,
      input,
    });
    if (!shouldProceed) return;

    await onQueryImpl(
      latestMessages,
      newMessages,
      abortController,
      shouldQuery,
      additionalAllowedTools,
      mainLoopModelParam,
      input,
      effort,
    );
  } finally {
    if (queryGuard.end(thisGeneration)) {
      await finalizeCompletedOuterReplQuery({
        ...finalizeArgs,
        abortController,
      });
    }

    maybeRestoreCanceledOuterReplQuery({
      ...restoreCanceledArgs,
      abortController,
      queryIsActive: queryGuard.isActive,
      inputValue: restoreCanceledArgs.inputValue,
    });
  }
}
