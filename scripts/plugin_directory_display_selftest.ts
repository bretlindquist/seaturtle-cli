import { resolvePluginsDirectoryName } from '../source/src/utils/plugins/pluginDirectoryMode.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

assert(
  resolvePluginsDirectoryName({
    useCoworkSessionState: false,
    useCoworkEnv: '1',
  }) === 'cowork_plugins',
  'expected cowork plugin mode to select the cowork plugin directory name',
)

assert(
  resolvePluginsDirectoryName({
    useCoworkSessionState: false,
    useCoworkEnv: '0',
  }) === 'plugins',
  'expected standard plugin mode to select the standard plugin directory name',
)

assert(
  resolvePluginsDirectoryName({
    useCoworkSessionState: true,
    useCoworkEnv: '0',
  }) === 'cowork_plugins',
  'expected session cowork state to take precedence over the environment flag',
)

console.log('plugin-directory-display selftest passed')
