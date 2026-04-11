export type OnboardingStepId =
  | 'preflight'
  | 'ct-identity'
  | 'theme'
  | 'oauth'
  | 'api-key'
  | 'security'
  | 'terminal-setup'

export function buildOnboardingStepIds(input: {
  oauthEnabled: boolean
  shouldShowCtIdentityBootstrap: boolean
  hasApiKeyNeedingApproval: boolean
  shouldOfferTerminalSetupStep: boolean
}): OnboardingStepId[] {
  const steps: OnboardingStepId[] = []

  if (input.oauthEnabled) {
    steps.push('preflight')
  }

  if (input.shouldShowCtIdentityBootstrap) {
    steps.push('ct-identity')
  }

  steps.push('theme')

  if (input.hasApiKeyNeedingApproval) {
    steps.push('api-key')
  }

  if (input.oauthEnabled) {
    steps.push('oauth')
  }

  steps.push('security')

  if (input.shouldOfferTerminalSetupStep) {
    steps.push('terminal-setup')
  }

  return steps
}
