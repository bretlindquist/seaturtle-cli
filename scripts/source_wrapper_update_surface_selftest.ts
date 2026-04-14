import { strict as assert } from 'assert'
import {
  buildStartupUpdateSignal,
  getStartupUpdateAction,
} from '../source/src/services/update/startupUpdateSignalCore.js'

const neverSkip = () => false

assert.deepEqual(getStartupUpdateAction('source-wrapper'), {
  label: 'Rebuild local CT',
  command: 'node scripts/build-cli.mjs --no-minify',
})

const signal = buildStartupUpdateSignal({
  currentVersion: '1.05',
  latestVersion: '1.06',
  versionSource: 'seaturtle-upstream',
  channel: 'latest',
  installationType: 'source-wrapper',
  shouldSkipVersion: neverSkip,
})

assert(signal, 'expected startup update signal for source-wrapper installs')
assert.equal(signal?.action.label, 'Rebuild local CT')
assert.equal(signal?.action.command, 'node scripts/build-cli.mjs --no-minify')

console.log('source_wrapper_update_surface_selftest: ok')
