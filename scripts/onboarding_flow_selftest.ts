import assert from 'node:assert/strict'

import { buildOnboardingStepIds } from '../source/src/components/onboardingFlowCore.ts'

function run(): void {
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
