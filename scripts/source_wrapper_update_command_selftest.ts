import { strict as assert } from 'assert'
import { readFileSync } from 'fs'

const updateSource = readFileSync('source/src/cli/update.ts', 'utf8')
const startupSource = readFileSync(
  'source/src/services/update/startupUpdateSignal.ts',
  'utf8',
)
const wrapperSource = readFileSync(
  'source/src/components/AutoUpdaterWrapper.tsx',
  'utf8',
)

assert(
  updateSource.includes("diagnostic.installationType === 'source-wrapper'"),
  'expected ct update to handle source-wrapper installs explicitly',
)
assert(
  updateSource.includes("['scripts/build-cli.mjs', '--no-minify']"),
  'expected source-wrapper update to rebuild the local dist with the canonical build command',
)
assert(
  startupSource.includes("installationType === 'source-wrapper'"),
  'expected startup update checks to limit SeaTurtle upstream version checks to source-wrapper installs',
)
assert(
  wrapperSource.includes('setIsSourceWrapper(installationType === "source-wrapper")'),
  'expected auto-updater wrapper to detect source-wrapper installs',
)
assert(
  wrapperSource.includes('if (isSourceWrapper) {'),
  'expected source-wrapper installs to skip the packaged auto-updater path',
)

console.log('source_wrapper_update_command_selftest: ok')
