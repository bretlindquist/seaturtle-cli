export type OnboardingStepId =
  | 'preflight'
  | 'ct-identity'
  | 'theme'
  | 'auth'
  | 'api-key'
  | 'security'
  | 'terminal-setup'

export function buildOnboardingStepIds(input: {
  authEnabled: boolean
  shouldShowCtIdentityBootstrap: boolean
  hasApiKeyNeedingApproval: boolean
  shouldOfferTerminalSetupStep: boolean
}): OnboardingStepId[] {
  const steps: OnboardingStepId[] = []

  if (input.authEnabled) {
    steps.push('preflight')
  }

  if (input.shouldShowCtIdentityBootstrap) {
    steps.push('ct-identity')
  }

  steps.push('theme')

  if (input.hasApiKeyNeedingApproval) {
    steps.push('api-key')
  }

  if (input.authEnabled) {
    steps.push('auth')
  }

  steps.push('security')

  if (input.shouldOfferTerminalSetupStep) {
    steps.push('terminal-setup')
  }

  return steps
}
