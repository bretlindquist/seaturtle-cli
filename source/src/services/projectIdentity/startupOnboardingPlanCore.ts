export type StartupOnboardingPlanInput = {
  hasTheme: boolean
  hasCompletedGlobalOnboarding: boolean
  shouldShowCtIdentityBootstrap: boolean
}

export type StartupOnboardingPlan = {
  showGlobalOnboarding: boolean
  includeCtIdentityInGlobalOnboarding: boolean
  showStandaloneCtIdentityBootstrap: boolean
}

export function buildStartupOnboardingPlan(
  input: StartupOnboardingPlanInput,
): StartupOnboardingPlan {
  const showGlobalOnboarding =
    !input.hasTheme || !input.hasCompletedGlobalOnboarding
  const includeCtIdentityInGlobalOnboarding =
    showGlobalOnboarding && input.shouldShowCtIdentityBootstrap

  return {
    showGlobalOnboarding,
    includeCtIdentityInGlobalOnboarding,
    showStandaloneCtIdentityBootstrap:
      !showGlobalOnboarding && input.shouldShowCtIdentityBootstrap,
  }
}
