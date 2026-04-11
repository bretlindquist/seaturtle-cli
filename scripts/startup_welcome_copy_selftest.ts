import { getWelcomeBodyLines } from '../source/src/components/LogoV2/welcomeCopyCore.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function run(): void {
  const defaultLines = getWelcomeBodyLines('default')
  assert(defaultLines.length === 3, 'expected default welcome to carry three guidance lines')
  assert(
    defaultLines[0]?.includes('/login') &&
      defaultLines[0]?.includes('/ct') &&
      defaultLines[0]?.includes('/telegram'),
    'expected default welcome to point users at login, CT, and Telegram entry points',
  )
  assert(
    defaultLines[2]?.includes('ct --continue') &&
      defaultLines[2]?.includes('/resume'),
    'expected default welcome to surface the shared session resume affordance',
  )

  const onboardingLines = getWelcomeBodyLines('onboarding')
  assert(onboardingLines.length === 2, 'expected onboarding welcome to stay compact')
  assert(
    onboardingLines[0]?.includes('private .ct project layer') &&
      onboardingLines[0]?.includes('auth'),
    'expected onboarding welcome to explain the first-run setup scope',
  )
  assert(
    onboardingLines[1]?.includes('stock starter kit') &&
      onboardingLines[1]?.includes('tune how CT shows up here'),
    'expected onboarding welcome to explain the starter-vs-guided choice',
  )
}

run()
console.log('startup welcome copy self-test passed')
