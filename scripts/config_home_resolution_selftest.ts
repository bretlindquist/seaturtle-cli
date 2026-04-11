import {
  formatConfigHomeDisplayPath,
  resolveSeaTurtleConfigHomeDir,
} from '../source/src/utils/configHome.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const HOME_DIR = '/Users/tester'

assert(
  resolveSeaTurtleConfigHomeDir({
    seaTurtleConfigDirEnv: '/tmp/seaturtle-config',
    claudeConfigDirEnv: '/tmp/claude-config',
    homeDir: HOME_DIR,
    seaTurtleDirExists: false,
    claudeDirExists: false,
  }) === '/tmp/seaturtle-config',
  'expected SEATURTLE_CONFIG_DIR to take precedence over all other config-home signals',
)

assert(
  resolveSeaTurtleConfigHomeDir({
    seaTurtleConfigDirEnv: undefined,
    claudeConfigDirEnv: '/tmp/claude-config',
    homeDir: HOME_DIR,
    seaTurtleDirExists: false,
    claudeDirExists: false,
  }) === '/tmp/claude-config',
  'expected CLAUDE_CONFIG_DIR to remain a supported compatibility override',
)

assert(
  resolveSeaTurtleConfigHomeDir({
    seaTurtleConfigDirEnv: undefined,
    claudeConfigDirEnv: undefined,
    homeDir: HOME_DIR,
    seaTurtleDirExists: true,
    claudeDirExists: true,
  }) === '/Users/tester/.seaturtle',
  'expected ~/.seaturtle to win when both SeaTurtle and Claude config homes exist',
)

assert(
  resolveSeaTurtleConfigHomeDir({
    seaTurtleConfigDirEnv: undefined,
    claudeConfigDirEnv: undefined,
    homeDir: HOME_DIR,
    seaTurtleDirExists: false,
    claudeDirExists: true,
  }) === '/Users/tester/.claude',
  'expected existing ~/.claude installs to keep using their established config home',
)

assert(
  resolveSeaTurtleConfigHomeDir({
    seaTurtleConfigDirEnv: undefined,
    claudeConfigDirEnv: undefined,
    homeDir: HOME_DIR,
    seaTurtleDirExists: false,
    claudeDirExists: false,
  }) === '/Users/tester/.seaturtle',
  'expected fresh installs without prior state to default to ~/.seaturtle',
)

assert(
  formatConfigHomeDisplayPath('/Users/tester/.seaturtle', HOME_DIR) ===
    '~/.seaturtle',
  'expected config-home display path to collapse inside-home paths to ~',
)

assert(
  formatConfigHomeDisplayPath('/Volumes/shared/ct-config', HOME_DIR) ===
    '/Volumes/shared/ct-config',
  'expected config-home display path to preserve non-home absolute paths',
)

console.log('config-home-resolution selftest passed')
