import { strict as assert } from 'assert'
import {
  getSeaTurtleReleaseAssetName,
  getSeaTurtleReleaseBinaryName,
  getSeaTurtleReleaseChecksumAssetName,
  getSeaTurtleReleaseInstallMetadataPath,
  isSeaTurtleWindowsReleasePlatform,
  normalizeSeaTurtleReleaseVersionTag,
} from '../source/src/utils/githubReleaseInstall.js'

assert.equal(normalizeSeaTurtleReleaseVersionTag('1.13'), 'v1.13')
assert.equal(normalizeSeaTurtleReleaseVersionTag('v1.13'), 'v1.13')
assert.equal(
  getSeaTurtleReleaseAssetName('darwin-arm64'),
  'seaturtle-darwin-arm64.tar.gz',
)
assert.equal(
  getSeaTurtleReleaseChecksumAssetName('darwin-arm64'),
  'seaturtle-darwin-arm64.tar.gz.sha256',
)
assert.equal(
  getSeaTurtleReleaseAssetName('windows-x64'),
  'seaturtle-windows-x64.zip',
)
assert.equal(
  getSeaTurtleReleaseChecksumAssetName('windows-x64'),
  'seaturtle-windows-x64.zip.sha256',
)
assert.equal(getSeaTurtleReleaseBinaryName('darwin-arm64'), 'ct')
assert.equal(getSeaTurtleReleaseBinaryName('windows-x64'), 'ct.exe')
assert.equal(isSeaTurtleWindowsReleasePlatform('windows-x64'), true)
assert.equal(isSeaTurtleWindowsReleasePlatform('darwin-arm64'), false)
assert(
  getSeaTurtleReleaseInstallMetadataPath().endsWith(
    '/seaturtle/install.json',
  ),
  'expected SeaTurtle release install metadata to live under XDG data home',
)

console.log('github_release_install_selftest: ok')
