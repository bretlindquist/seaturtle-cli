import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '..')
const createSSHSessionPath = path.join(
  repoRoot,
  'source/src/ssh/createSSHSession.ts',
)
const openAiOauthPath = path.join(
  repoRoot,
  'source/src/services/authProfiles/openaiCodexOAuth.ts',
)
const tipRegistryPath = path.join(
  repoRoot,
  'source/src/services/tips/tipRegistry.ts',
)
const mainPath = path.join(repoRoot, 'source/src/main.tsx')
const openAiDocsPath = path.join(repoRoot, 'docs/OPENAI-CODEX.md')
const geminiDocsPath = path.join(repoRoot, 'docs/GEMINI.md')

const createSSHSessionSource = readFileSync(createSSHSessionPath, 'utf8')
assert.match(
  createSSHSessionSource,
  /linux-x64'.*bun-linux-x64/s,
  'SSH launcher should map Linux x64 hosts to bun-linux-x64',
)
assert.match(
  createSSHSessionSource,
  /linux-arm64'.*bun-linux-arm64/s,
  'SSH launcher should map Linux arm64 hosts to bun-linux-arm64',
)
assert.match(
  createSSHSessionSource,
  /darwin-arm64'.*bun-darwin-arm64/s,
  'SSH launcher should map Darwin arm64 hosts to bun-darwin-arm64',
)
assert.match(
  createSSHSessionSource,
  /compileArtifactForTarget/,
  'SSH launcher should compile or reuse a target-matched remote artifact',
)
assert.match(
  createSSHSessionSource,
  /CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST/,
  'SSH launcher should mark remote sessions as host-managed provider sessions',
)
assert.match(
  createSSHSessionSource,
  /export CODEX_HOME="\$SELF_DIR\/codex-home"/,
  'launch script should mount a scoped CODEX_HOME when Codex auth is present',
)
assert.match(
  createSSHSessionSource,
  /exec \$\{quotePosix\(remoteBinary\)\}/,
  'launch script should execute the uploaded remote runtime',
)

const openAiOauthSource = readFileSync(openAiOauthPath, 'utf8')
assert.match(
  openAiOauthSource,
  /saveExternalCodexCliAuth/,
  'OpenAI fallback auth should persist refreshed Codex auth when available',
)
assert.match(
  openAiOauthSource,
  /isExpiredOrNearExpiry\(getExpiryFromJwt\(fallback\.accessToken\)\)/,
  'OpenAI fallback auth should refresh expired remote Codex auth before use',
)

const tipRegistrySource = readFileSync(tipRegistryPath, 'utf8')
assert.match(
  tipRegistrySource,
  /runtime\.execution\.family === 'anthropic'/,
  'cloud tip should gate the legacy ct --remote guidance to Anthropic',
)
assert.match(
  tipRegistrySource,
  /ct ssh <host>/,
  'cloud tip should point OpenAI\/Gemini users to ct ssh',
)

const mainSource = readFileSync(mainPath, 'utf8')
assert.match(
  mainSource,
  /provider-managed remote session/,
  'SSH help copy should describe the provider-managed remote-host path',
)
assert.doesNotMatch(
  mainSource,
  /unix-socket -R → local proxy/,
  'SSH info copy should no longer describe the old Anthropic unix-socket tunnel',
)

assert.match(
  readFileSync(openAiDocsPath, 'utf8'),
  /OpenAI\/Codex does not use `ct --remote`[\s\S]*ct ssh <host>/,
  'OpenAI docs should point cloud offload to ct ssh and reject ct --remote',
)
assert.match(
  readFileSync(geminiDocsPath, 'utf8'),
  /Gemini does not use `ct --remote`[\s\S]*ct ssh <host>/,
  'Gemini docs should point cloud offload to ct ssh and reject ct --remote',
)

console.log('ssh remote provider selftest passed')
