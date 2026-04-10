import {
  buildStartupUpdateSignal,
  getActionableStartupUpdateVersion,
  getStartupUpdateAction,
} from '../source/src/services/update/startupUpdateSignalCore.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const neverSkip = () => false

function run(): void {
  assert(
    getActionableStartupUpdateVersion({
      currentVersion: '1.2.0',
      latestVersion: '1.2.0',
      shouldSkipVersion: neverSkip,
    }) === null,
    'expected no startup update when latest equals current',
  )
  assert(
    getActionableStartupUpdateVersion({
      currentVersion: '1.2.1',
      latestVersion: '1.2.0',
      shouldSkipVersion: neverSkip,
    }) === null,
    'expected no startup update when latest is behind current',
  )
  assert(
    getActionableStartupUpdateVersion({
      currentVersion: '1.2.0',
      latestVersion: '1.3.0',
      shouldSkipVersion: version => version === '1.3.0',
    }) === null,
    'expected no startup update when the target version is skipped',
  )
  assert(
    getActionableStartupUpdateVersion({
      currentVersion: '1.2.0',
      latestVersion: '1.4.0',
      maxVersion: '1.1.0',
      shouldSkipVersion: neverSkip,
    }) === null,
    'expected no startup update when the max-version cap is not newer than current',
  )
  assert(
    getActionableStartupUpdateVersion({
      currentVersion: '1.2.0',
      latestVersion: '1.4.0',
      maxVersion: '1.3.0',
      shouldSkipVersion: neverSkip,
    }) === '1.3.0',
    'expected startup update to cap latest to the max-version kill-switch value',
  )

  assert(
    getStartupUpdateAction('npm-global').command === 'ct update',
    'expected npm/global installs to route users to ct update',
  )
  assert(
    getStartupUpdateAction('package-manager', 'homebrew').command ===
      'brew upgrade claude-code',
    'expected Homebrew installs to show the Homebrew update command',
  )
  assert(
    getStartupUpdateAction('package-manager', 'unknown').label.includes(
      'package manager',
    ),
    'expected unknown package-manager installs to use generic package-manager guidance',
  )

  const signal = buildStartupUpdateSignal({
    currentVersion: '1.2.0',
    latestVersion: '1.3.0',
    channel: 'latest',
    installationType: 'npm-local',
    shouldSkipVersion: neverSkip,
  })
  assert(signal !== null, 'expected an actionable startup update signal')
  assert(
    signal.latestVersion === '1.3.0' && signal.action.command === 'ct update',
    'expected startup update signal to carry latest version and update action',
  )
}

run()
