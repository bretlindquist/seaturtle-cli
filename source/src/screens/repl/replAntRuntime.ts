/* eslint-disable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */

export function isReplAntBuild(): boolean {
  return "external" === 'ant';
}

export const useReplFrustrationDetection: typeof import('../../components/FeedbackSurvey/useFrustrationDetection.js').useFrustrationDetection = isReplAntBuild() ? require('../../components/FeedbackSurvey/useFrustrationDetection.js').useFrustrationDetection : () => ({
  state: 'closed',
  handleTranscriptSelect: () => {}
});

export const useReplAntOrgWarningNotification: typeof import('../../hooks/notifs/useAntOrgWarningNotification.js').useAntOrgWarningNotification = isReplAntBuild() ? require('../../hooks/notifs/useAntOrgWarningNotification.js').useAntOrgWarningNotification : () => {};

const shouldShowAntModelSwitch = isReplAntBuild() ? require('../../components/AntModelSwitchCallout.js').shouldShowModelSwitchCallout : (): boolean => false;

export function shouldShowInitialModelSwitchCallout(): boolean {
  return shouldShowAntModelSwitch();
}

export async function shouldShowUndercoverCallout(): Promise<boolean> {
  if (!isReplAntBuild()) return false;
  const { isInternalModelRepo } = await import('../../utils/commitAttribution.js');
  await isInternalModelRepo();
  const { shouldShowUndercoverAutoNotice } = await import('../../utils/undercover.js');
  return shouldShowUndercoverAutoNotice();
}

export function getSurveyRequestFeedbackCommand(): string {
  return isReplAntBuild() ? '/issue' : '/feedback';
}

/* eslint-enable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
