export function getSessionResumeAffordanceText(): string {
  return 'Fresh session by default. Use ct --continue to resume the last thread, ct --resume to browse earlier ones, or /resume once you are inside CT.'
}

export function getSessionResumeTipText(): string {
  return 'CT starts fresh by default. Run ct --continue to resume the last conversation or ct --resume to browse earlier ones.'
}

export function getSessionResumeFeedFooterText(): string {
  return '/continue for last · /resume for picker'
}

export function getNoResumableSessionsText(): string {
  return 'No conversations found to resume. /resume opens the picker when sessions exist, and /continue resumes the most recent session in this directory.'
}
