import { isLocalInstallationExecPath } from '../source/src/utils/localInstallerPaths.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

assert(
  isLocalInstallationExecPath(
    '/Users/tester/.seaturtle/local/node_modules/.bin/claude',
    '/Users/tester/.seaturtle/local',
  ),
  'expected local installer detection to work for SeaTurtle config-home installs',
)

assert(
  isLocalInstallationExecPath(
    'C:\\Users\\tester\\.seaturtle\\local\\node_modules\\.bin\\claude',
    'C:\\Users\\tester\\.seaturtle\\local',
  ),
  'expected local installer detection to work for Windows-style exec paths',
)

assert(
  !isLocalInstallationExecPath(
    '/Users/tester/.claude/local/node_modules/.bin/claude',
    '/Users/tester/.seaturtle/local',
  ),
  'expected local installer detection to reject stale Claude-home paths when the active install dir differs',
)

console.log('local-installer-path selftest passed')
