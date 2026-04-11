import { getSessionResumeAffordanceText } from '../../services/sessionResume/sessionResumeCopy.js'

export type WelcomeMode = 'default' | 'onboarding'

export function getWelcomeBodyLines(mode: WelcomeMode): string[] {
  if (mode === 'onboarding') {
    return [
      'First run will set the theme, the private .ct project layer, auth, and terminal basics in one pass.',
      'You can keep the stock starter kit, tune how CT shows up here, or skip the pieces that are not needed yet.',
    ]
  }

  return [
    'Start with /login, /ct, or /telegram and CT will guide the next step.',
    'If you want to slow down first, ask for a research pass or a surgical plan.',
    getSessionResumeAffordanceText(),
  ]
}
