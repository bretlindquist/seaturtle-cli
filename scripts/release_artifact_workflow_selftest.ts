import { strict as assert } from 'assert'
import { readFileSync } from 'fs'

const publishScript = readFileSync(
  'scripts/publish-release-assets.sh',
  'utf8',
)
const readme = readFileSync('README.md', 'utf8')
const releaseInstallDoc = readFileSync('docs/RELEASE-INSTALL.md', 'utf8')

assert(
  publishScript.includes('gh release create "$tag"'),
  'expected publish script to create the release when it does not exist',
)
assert(
  publishScript.includes('gh release upload "$tag"'),
  'expected publish script to upload generated assets to the GitHub release',
)
assert(
  readme.includes('scripts/publish-release-assets.sh <tag>'),
  'expected README to document the release publish script',
)

for (const platform of [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
]) {
  assert(
    readme.includes(`- \`${platform}\``),
    `expected README to list ${platform} in the published artifact matrix`,
  )
  assert(
    releaseInstallDoc.includes(`- \`${platform}\``),
    `expected release install doc to list ${platform} in the published artifact matrix`,
  )
}

console.log('release_artifact_workflow_selftest: ok')
