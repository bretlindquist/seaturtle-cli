import assert from 'node:assert/strict'

import { buildOnboardingStepIds } from '../source/src/components/onboardingFlowCore.ts'
import { buildStartupOnboardingPlan } from '../source/src/services/projectIdentity/startupOnboardingPlanCore.ts'

function run(): void {
  assert.deepEqual(
    buildStartupOnboardingPlan({
      hasTheme: false,
      hasCompletedGlobalOnboarding: false,
      shouldShowCtIdentityBootstrap: true,
    }),
    {
      showGlobalOnboarding: true,
      includeCtIdentityInGlobalOnboarding: true,
      showStandaloneCtIdentityBootstrap: false,
    },
    'first run should inline CT identity into global onboarding instead of showing a second standalone prompt',
  )

  assert.deepEqual(
    buildStartupOnboardingPlan({
      hasTheme: true,
      hasCompletedGlobalOnboarding: true,
      shouldShowCtIdentityBootstrap: true,
    }),
    {
      showGlobalOnboarding: false,
      includeCtIdentityInGlobalOnboarding: false,
      showStandaloneCtIdentityBootstrap: true,
    },
    'returning projects should show standalone CT identity only when global onboarding is already complete',
  )

  assert.deepEqual(
    buildStartupOnboardingPlan({
      hasTheme: true,
      hasCompletedGlobalOnboarding: true,
      shouldShowCtIdentityBootstrap: false,
    }),
    {
      showGlobalOnboarding: false,
      includeCtIdentityInGlobalOnboarding: false,
      showStandaloneCtIdentityBootstrap: false,
    },
    'completed CT identity setup should not prompt from either startup path',
  )

  assert.deepEqual(
    buildOnboardingStepIds({
      oauthEnabled: true,
      shouldShowCtIdentityBootstrap: true,
      hasApiKeyNeedingApproval: true,
      shouldOfferTerminalSetupStep: true,
    }),
    [
      'preflight',
      'ct-identity',
      'theme',
      'api-key',
      'oauth',
      'security',
      'terminal-setup',
    ],
    'first-run onboarding should inline CT identity bootstrap before theme/auth work',
  )

  assert.deepEqual(
    buildOnboardingStepIds({
      oauthEnabled: false,
      shouldShowCtIdentityBootstrap: false,
      hasApiKeyNeedingApproval: false,
      shouldOfferTerminalSetupStep: false,
    }),
    ['theme', 'security'],
    'minimal onboarding should still keep the startup path simple and ordered',
  )
}

run()
console.log('onboarding flow self-test passed')
