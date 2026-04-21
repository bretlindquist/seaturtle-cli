import { strict as assert } from 'assert'
import {
  buildStartupUpdateSignal,
  getStartupUpdateAction,
} from '../source/src/services/update/startupUpdateSignalCore.js'

const neverSkip = () => false

assert.deepEqual(getStartupUpdateAction('source-wrapper'), {
  label: 'Update local CT',
  command: 'ct update',
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
assert.equal(signal?.action.label, 'Update local CT')
assert.equal(signal?.action.command, 'ct update')

console.log('source_wrapper_update_surface_selftest: ok')
