import { feature } from 'bun:bundle';
import type { UUID } from 'crypto';
import { asSessionId } from '../../types/ids.js';
import type { ResumeEntrypoint } from '../../commands.js';
import type { LogOption } from '../../types/logs.js';
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from 'src/services/analytics/index.js';
import { prepareReplSessionResume } from './prepareReplSessionResume.js';
import { finishReplSessionResume } from './finishReplSessionResume.js';

export async function resumeReplSession({
  sessionId,
  log,
  entrypoint,
  prepareArgs,
  finishArgs,
}: {
  sessionId: UUID;
  log: LogOption;
  entrypoint: ResumeEntrypoint;
  prepareArgs: Omit<Parameters<typeof prepareReplSessionResume>[0], 'sessionId' | 'log' | 'entrypoint'>;
  finishArgs: Omit<Parameters<typeof finishReplSessionResume>[0], 'sessionId' | 'log' | 'entrypoint' | 'messages'>;
}) {
  const resumeStart = performance.now();

  try {
    const { messages } = await prepareReplSessionResume({
      ...prepareArgs,
      sessionId,
      log,
      entrypoint,
    });

    await finishReplSessionResume({
      ...finishArgs,
      sessionId: asSessionId(sessionId),
      log,
      entrypoint,
      messages,
    });

    if (feature('COORDINATOR_MODE')) {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { saveMode } = require('../../utils/sessionStorage.js') as typeof import('../../utils/sessionStorage.js');
      const { isCoordinatorMode } = require('../../coordinator/coordinatorMode.js') as typeof import('../../coordinator/coordinatorMode.js');
      /* eslint-enable @typescript-eslint/no-require-imports */
      saveMode(isCoordinatorMode() ? 'coordinator' : 'normal');
    }

    logEvent('tengu_session_resumed', {
      entrypoint: entrypoint as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      success: true,
      resume_duration_ms: Math.round(performance.now() - resumeStart),
    });
  } catch (error) {
    logEvent('tengu_session_resumed', {
      entrypoint: entrypoint as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      success: false,
    });
    throw error;
  }
}
