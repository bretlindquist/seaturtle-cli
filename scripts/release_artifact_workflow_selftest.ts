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

for (const platform of ['darwin-arm64', 'windows-x64']) {
  assert(
    readme.includes(`- \`${platform}\``),
    `expected README to list ${platform} in the GitHub Actions release matrix`,
  )
  assert(
    releaseInstallDoc.includes(`- \`${platform}\``),
    `expected release install doc to list ${platform} in the GitHub Actions release matrix`,
  )
}

assert(
  readme.includes('release-artifacts.yml'),
  'expected README to mention the release workflow file',
)
assert(
  releaseInstallDoc.includes('Windows release artifacts are published to GitHub releases'),
  'expected release install doc to describe Windows GitHub release artifacts',
)
assert(
  releaseInstallDoc.includes('The curl installer remains Unix-only today'),
  'expected release install doc to keep Windows installer support scoped honestly',
)
assert(
  releaseInstallDoc.includes('Windows GitHub-release installs, CT now also checks for newer GitHub'),
  'expected release install doc to describe the Windows startup update prompt lane',
)
assert(
  readme.includes('Windows GitHub-release installs now check that upstream release lane at startup'),
  'expected README to mention the Windows GitHub-release updater path',
)
assert(
  releaseInstallDoc.includes('gh workflow run release-artifacts.yml -f tag=v1.12'),
  'expected release install doc to describe the manual GitHub Actions dispatch path',
)
assert(
  readme.includes('verify `release-windows-x64` uploaded `seaturtle-windows-x64.zip`'),
  'expected README to document the Windows release artifact verification step',
)

console.log('release_artifact_workflow_selftest: ok')
