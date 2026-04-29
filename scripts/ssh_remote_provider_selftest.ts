import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '..')
const createSSHSessionPath = path.join(
  repoRoot,
  'source/src/ssh/createSSHSession.ts',
)
const sshSessionManagerPath = path.join(
  repoRoot,
  'source/src/ssh/SSHSessionManager.ts',
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
const buildScriptPath = path.join(repoRoot, 'scripts/build-cli.mjs')
const openAiDocsPath = path.join(repoRoot, 'docs/OPENAI-CODEX.md')
const geminiDocsPath = path.join(repoRoot, 'docs/GEMINI.md')

const createSSHSessionSource = readFileSync(createSSHSessionPath, 'utf8')
const sshSessionManagerSource = readFileSync(sshSessionManagerPath, 'utf8')
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
assert.doesNotMatch(
  sshSessionManagerSource,
  /private readonly stdout = this\.proc\.stdout|private readonly stderr = this\.proc\.stderr/,
  'SSH session manager should not read proc stdio from field initializers before the constructor parameter property is assigned',
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
const buildScriptSource = readFileSync(buildScriptPath, 'utf8')
assert.match(
  mainSource,
  /provider-managed remote session/,
  'SSH help copy should describe the provider-managed remote-host path',
)
assert.match(
  mainSource,
  /program\.command\('ssh-check \[host\] \[dir\]'\)/,
  'CLI should expose a dedicated ssh-check live probe command',
)
assert.match(
  buildScriptSource,
  /'SSH_REMOTE'/,
  'build script should keep SSH_REMOTE enabled so ssh and ssh-check reach the shipped CLI',
)
assert.doesNotMatch(
  mainSource,
  /unix-socket -R → local proxy/,
  'SSH info copy should no longer describe the old Anthropic unix-socket tunnel',
)

assert.match(
  readFileSync(openAiDocsPath, 'utf8'),
  /OpenAI\/Codex does not use `ct --remote`[\s\S]*ct ssh-check --local[\s\S]*ct ssh <host>/,
  'OpenAI docs should document the ssh-check live probe before the ct ssh offload path',
)
assert.match(
  readFileSync(geminiDocsPath, 'utf8'),
  /Gemini does not use `ct --remote`[\s\S]*ct ssh-check --local[\s\S]*ct ssh <host>/,
  'Gemini docs should document the ssh-check live probe before the ct ssh offload path',
)

console.log('ssh remote provider selftest passed')
