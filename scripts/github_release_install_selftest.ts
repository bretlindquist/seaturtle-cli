import { strict as assert } from 'assert'
import {
  getSeaTurtleReleaseAssetName,
  getSeaTurtleReleaseChecksumAssetName,
  getSeaTurtleReleaseInstallMetadataPath,
  normalizeSeaTurtleReleaseVersionTag,
} from '../source/src/utils/githubReleaseInstall.js'

assert.equal(normalizeSeaTurtleReleaseVersionTag('1.11'), 'v1.11')
assert.equal(normalizeSeaTurtleReleaseVersionTag('v1.11'), 'v1.11')
assert.equal(
  getSeaTurtleReleaseAssetName('darwin-arm64'),
  'seaturtle-darwin-arm64.tar.gz',
)
assert.equal(
  getSeaTurtleReleaseChecksumAssetName('darwin-arm64'),
  'seaturtle-darwin-arm64.tar.gz.sha256',
)
assert(
  getSeaTurtleReleaseInstallMetadataPath().endsWith(
    '/seaturtle/install.json',
  ),
  'expected SeaTurtle release install metadata to live under XDG data home',
)

console.log('github_release_install_selftest: ok')
