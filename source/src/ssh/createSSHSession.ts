import { spawn, spawnSync } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logForDebugging } from '../utils/debug.js'
import { getInitialEffortSetting, toPersistableEffort } from '../utils/effort.js'
import { isInBundledMode } from '../utils/bundledMode.js'
import { getMainLoopModel } from '../utils/model/model.js'
import { getMainLoopProviderRuntime } from '../services/api/providerRuntime.js'
import {
  getResolvedOpenAiCodexAuth,
  getStoredOpenAiCodexApiKeyAuth,
} from '../services/authProfiles/openaiCodexAuth.js'
import { resolveOpenAiCodexApiKeyAuthFromEnv } from '../services/authProfiles/openaiCodexAuthCore.js'
import { getResolvedGeminiApiKeyAuth } from '../services/authProfiles/geminiAuth.js'
import {
  getDefaultOpenAiCodexOAuthProfile,
  readExternalCodexCliAuth,
} from '../services/authProfiles/store.js'
import { SSHSessionManager } from './SSHSessionManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const distCliPath = join(repoRoot, 'dist', 'cli.js')
const artifactCacheRoot = join(tmpdir(), 'seaturtle-ssh-artifacts')

const MAX_STDERR_BYTES = 32_768
const WORKFLOW_HANDOFF_FILENAME = 'workflow-handoff.json'

type ProgressCallbacks = {
  onProgress?: (message: string) => void
}

export type RemoteHostOffloadBuildReadiness = {
  ready: boolean
  reason: string | null
}

export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

export type SSHSession = {
  proc: ChildProcessWithoutNullStreams
  remoteCwd: string
  proxy: {
    stop(): void
  }
  createManager: (
    callbacks: ConstructorParameters<typeof SSHSessionManager>[1],
  ) => SSHSessionManager
  getStderrTail: () => string
}

type CreateSSHSessionOptions = {
  host: string
  cwd?: string
  localVersion: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  extraCliArgs?: string[]
  prompt?: string
  structuredInput?: boolean
  workflowHandoffJson?: string
  replaceWorkflowHandoff?: boolean
}

type CreateLocalSSHSessionOptions = {
  cwd?: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  extraCliArgs?: string[]
  prompt?: string
  structuredInput?: boolean
  workflowHandoffJson?: string
  replaceWorkflowHandoff?: boolean
}

type RemoteTarget = {
  platformId: 'linux-x64' | 'linux-arm64' | 'darwin-x64' | 'darwin-arm64'
  bunTarget:
    | 'bun-linux-x64'
    | 'bun-linux-arm64'
    | 'bun-darwin-x64'
    | 'bun-darwin-arm64'
}

type RemoteAuthMaterial =
  | {
      providerEnv: Record<string, string>
      codexAuthJson?: string
    }
  | {
      error: string
    }

function quotePosix(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`
}

function runChecked(
  command: string,
  args: string[],
  options?: {
    input?: string
    stdio?: 'inherit' | 'pipe'
  },
): { stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio:
      options?.stdio === 'inherit'
        ? 'inherit'
        : ['pipe', 'pipe', 'pipe'],
    input: options?.input,
  })

  if (result.status !== 0) {
    const stderr =
      typeof result.stderr === 'string' && result.stderr.trim().length > 0
        ? result.stderr.trim()
        : `${command} ${args.join(' ')} failed`
    throw new SSHSessionError(stderr)
  }

  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
  }
}

function resolveRemoteTarget(unameSystem: string, unameArch: string): RemoteTarget {
  const system = unameSystem.trim().toLowerCase()
  const arch = unameArch.trim().toLowerCase()

  if (system === 'linux') {
    if (arch === 'x86_64' || arch === 'amd64') {
      return { platformId: 'linux-x64', bunTarget: 'bun-linux-x64' }
    }
    if (arch === 'aarch64' || arch === 'arm64') {
      return { platformId: 'linux-arm64', bunTarget: 'bun-linux-arm64' }
    }
  }

  if (system === 'darwin') {
    if (arch === 'x86_64') {
      return { platformId: 'darwin-x64', bunTarget: 'bun-darwin-x64' }
    }
    if (arch === 'arm64') {
      return { platformId: 'darwin-arm64', bunTarget: 'bun-darwin-arm64' }
    }
  }

  throw new SSHSessionError(
    `Unsupported remote host platform: ${unameSystem.trim()} ${unameArch.trim()}`,
  )
}

function requireLocalSourceBuild(): void {
  const readiness = getRemoteHostOffloadBuildReadiness()
  if (!readiness.ready) {
    throw new SSHSessionError(
      readiness.reason ??
        'Remote-host offload is not ready in this source build.',
    )
  }
}

export function getRemoteHostOffloadBuildReadiness(): RemoteHostOffloadBuildReadiness {
  if (isInBundledMode() || existsSync(distCliPath)) {
    return {
      ready: true,
      reason: null,
    }
  }

  return {
    ready: false,
    reason:
      'dist/cli.js is missing. Build SeaTurtle first with `node scripts/build-cli.mjs --no-minify` before using `ct ssh` in this source build.',
  }
}

function compileArtifactForTarget(
  target: RemoteTarget,
  localVersion: string,
  onProgress?: (message: string) => void,
): string {
  requireLocalSourceBuild()
  const sourceStat = statSync(distCliPath)
  const targetDir = join(
    artifactCacheRoot,
    localVersion,
    target.platformId,
  )
  const outputPath = join(targetDir, 'ct')

  if (existsSync(outputPath)) {
    const outputStat = statSync(outputPath)
    if (outputStat.mtimeMs >= sourceStat.mtimeMs) {
      return outputPath
    }
  }

  mkdirSync(targetDir, { recursive: true })
  onProgress?.(`Compiling ${target.platformId} SeaTurtle runtime`)
  runChecked(
    'bun',
    [
      'build',
      '--compile',
      '--target',
      target.bunTarget,
      distCliPath,
      '--outfile',
      outputPath,
    ],
    {
      stdio: 'inherit',
    },
  )
  chmodSync(outputPath, 0o755)
  return outputPath
}

function collectRemoteCliArgs(params: {
  cwd?: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  extraCliArgs?: string[]
  prompt?: string
  structuredInput?: boolean
}): string[] {
  const args = [
    '--print',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
  ]

  if (params.structuredInput !== false) {
    args.push('--input-format', 'stream-json')
  }

  const runtime = getMainLoopProviderRuntime()
  const model = getMainLoopModel()
  const effort = toPersistableEffort(getInitialEffortSetting())

  if (runtime.family !== 'anthropic') {
    args.push('--model', model)
  }
  if (effort) {
    args.push('--effort', effort)
  }
  if (params.permissionMode) {
    args.push('--permission-mode', params.permissionMode)
  }
  if (params.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions')
  }
  if (params.extraCliArgs?.length) {
    args.push(...params.extraCliArgs)
  }
  if (params.prompt) {
    args.push(params.prompt)
  }

  return args
}

function appendWorkflowHandoffCliArgs(
  args: string[],
  workflowHandoffFile: string | null,
  replaceWorkflowHandoff: boolean | undefined,
): string[] {
  if (!workflowHandoffFile) {
    return args
  }

  const next = [...args, '--workflow-handoff-file', workflowHandoffFile]
  if (replaceWorkflowHandoff) {
    next.push('--replace-workflow-handoff')
  }
  return next
}

async function buildRemoteAuthMaterial(): Promise<RemoteAuthMaterial> {
  const runtime = getMainLoopProviderRuntime()
  const providerEnv: Record<string, string> = {
    CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: '1',
  }

  if (runtime.provider === 'openai-codex') {
    providerEnv.SEATURTLE_MAIN_PROVIDER = 'openai-codex'
    providerEnv.SEATURTLE_USE_OPENAI_CODEX = '1'
    providerEnv.SEATURTLE_USE_GEMINI = '0'

    const resolved = await getResolvedOpenAiCodexAuth()
    if (!resolved) {
      return {
        error:
          'OpenAI/Codex auth is not configured locally. Sign in through CT or set OPENAI_API_KEY before using `ct ssh` on the OpenAI runtime.',
      }
    }

    if (resolved.mode === 'api_key') {
      providerEnv.OPENAI_API_KEY = resolved.apiKey
      if (resolved.organizationId) {
        providerEnv.OPENAI_ORGANIZATION = resolved.organizationId
      }
      if (resolved.projectId) {
        providerEnv.OPENAI_PROJECT = resolved.projectId
      }
      if (resolved.baseUrl) {
        providerEnv.OPENAI_BASE_URL = resolved.baseUrl
      }
      return { providerEnv }
    }

    const nativeProfile = getDefaultOpenAiCodexOAuthProfile()
    const fallback = readExternalCodexCliAuth()
    const refreshToken =
      nativeProfile?.refreshToken ??
      fallback?.refreshToken ??
      undefined

    return {
      providerEnv,
      codexAuthJson: JSON.stringify(
        {
          tokens: {
            access_token: resolved.accessToken,
            account_id: resolved.accountId,
            ...(refreshToken ? { refresh_token: refreshToken } : {}),
          },
        },
        null,
        2,
      ),
    }
  }

  if (runtime.provider === 'gemini') {
    providerEnv.SEATURTLE_MAIN_PROVIDER = 'gemini'
    providerEnv.SEATURTLE_USE_GEMINI = '1'
    providerEnv.SEATURTLE_USE_OPENAI_CODEX = '0'

    const auth = getResolvedGeminiApiKeyAuth()
    if (!auth) {
      return {
        error:
          'Gemini auth is not configured locally. Link Gemini in CT or set GEMINI_API_KEY before using `ct ssh` on the Gemini runtime.',
      }
    }

    providerEnv.GEMINI_API_KEY = auth.apiKey
    if (auth.baseUrl) {
      providerEnv.GEMINI_BASE_URL = auth.baseUrl
    }
    return { providerEnv }
  }

  return {
    error:
      'Provider-managed remote-host sessions are implemented for OpenAI/Codex and Gemini in this build. Anthropic continues to use the claude.ai remote path.',
  }
}

function buildRemoteAuthMaterialSync(): RemoteAuthMaterial {
  const runtime = getMainLoopProviderRuntime()
  const providerEnv: Record<string, string> = {
    CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: '1',
  }

  if (runtime.provider === 'openai-codex') {
    providerEnv.SEATURTLE_MAIN_PROVIDER = 'openai-codex'
    providerEnv.SEATURTLE_USE_OPENAI_CODEX = '1'
    providerEnv.SEATURTLE_USE_GEMINI = '0'

    const apiKeyAuth =
      getStoredOpenAiCodexApiKeyAuth() ?? resolveOpenAiCodexApiKeyAuthFromEnv()
    if (apiKeyAuth) {
      providerEnv.OPENAI_API_KEY = apiKeyAuth.apiKey
      if (apiKeyAuth.organizationId) {
        providerEnv.OPENAI_ORGANIZATION = apiKeyAuth.organizationId
      }
      if (apiKeyAuth.projectId) {
        providerEnv.OPENAI_PROJECT = apiKeyAuth.projectId
      }
      providerEnv.OPENAI_BASE_URL = apiKeyAuth.baseUrl
      return { providerEnv }
    }

    const nativeProfile = getDefaultOpenAiCodexOAuthProfile()
    const fallback = readExternalCodexCliAuth()
    const accessToken = nativeProfile?.accessToken ?? fallback?.accessToken
    const accountId =
      nativeProfile?.accountUuid ?? nativeProfile?.metadata?.accountId ??
      fallback?.accountId
    if (!accessToken || typeof accountId !== 'string' || accountId.length === 0) {
      return {
        error:
          'OpenAI/Codex auth is not configured locally. Sign in through CT or set OPENAI_API_KEY before using `ct ssh` on the OpenAI runtime.',
      }
    }

    return {
      providerEnv,
      codexAuthJson: JSON.stringify(
        {
          tokens: {
            access_token: accessToken,
            account_id: accountId,
            ...(nativeProfile?.refreshToken || fallback?.refreshToken
              ? {
                  refresh_token:
                    nativeProfile?.refreshToken ?? fallback?.refreshToken,
                }
              : {}),
          },
        },
        null,
        2,
      ),
    }
  }

  if (runtime.provider === 'gemini') {
    providerEnv.SEATURTLE_MAIN_PROVIDER = 'gemini'
    providerEnv.SEATURTLE_USE_GEMINI = '1'
    providerEnv.SEATURTLE_USE_OPENAI_CODEX = '0'

    const auth = getResolvedGeminiApiKeyAuth()
    if (!auth) {
      return {
        error:
          'Gemini auth is not configured locally. Link Gemini in CT or set GEMINI_API_KEY before using `ct ssh` on the Gemini runtime.',
      }
    }

    providerEnv.GEMINI_API_KEY = auth.apiKey
    providerEnv.GEMINI_BASE_URL = auth.baseUrl
    return { providerEnv }
  }

  return {
    error:
      'Provider-managed remote-host sessions are implemented for OpenAI/Codex and Gemini in this build. Anthropic continues to use the claude.ai remote path.',
  }
}

function buildLaunchScript(params: {
  remoteDir: string
  remoteCwd: string
  providerEnv: Record<string, string>
  cliArgs: string[]
  hasCodexAuth: boolean
}): string {
  const exports = Object.entries(params.providerEnv)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `export ${key}=${quotePosix(value)}`)
    .join('\n')

  const remoteBinary = `${params.remoteDir}/ct`
  const args = params.cliArgs.map(quotePosix).join(' ')

  return `#!/bin/sh
set -eu
SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
${exports}
${params.hasCodexAuth ? 'export CODEX_HOME="$SELF_DIR/codex-home"' : ''}
cd ${quotePosix(params.remoteCwd)}
exec ${quotePosix(remoteBinary)}${args ? ` ${args}` : ''}
`
}

export const __sshTestUtils = {
  resolveRemoteTarget,
  buildLaunchScript,
}

function createSessionObject(params: {
  proc: ChildProcessWithoutNullStreams
  remoteCwd: string
  cleanup: () => void
}): SSHSession {
  const stderrChunks: string[] = []
  params.proc.stderr.on('data', chunk => {
    const next = Buffer.from(chunk).toString('utf8')
    stderrChunks.push(next)
    let total = stderrChunks.reduce((sum, entry) => sum + entry.length, 0)
    while (total > MAX_STDERR_BYTES && stderrChunks.length > 1) {
      const removed = stderrChunks.shift()
      total -= removed?.length ?? 0
    }
  })

  return {
    proc: params.proc,
    remoteCwd: params.remoteCwd,
    proxy: {
      stop() {
        params.cleanup()
      },
    },
    createManager(callbacks) {
      return new SSHSessionManager(params.proc, callbacks)
    },
    getStderrTail() {
      return stderrChunks.join('')
    },
  }
}

function localSpawnCommand(): { command: string; args: string[] } {
  if (isInBundledMode()) {
    return {
      command: process.execPath,
      args: [],
    }
  }

  const scriptPath = process.argv[1]
  if (!scriptPath) {
    throw new SSHSessionError(
      'Cannot determine the current SeaTurtle CLI entrypoint for `ct ssh --local`.',
    )
  }

  return {
    command: process.execPath,
    args: [scriptPath],
  }
}

export function createLocalSSHSession(
  options: CreateLocalSSHSessionOptions,
): SSHSession {
  const authMaterial = buildRemoteAuthMaterialSync()
  if ('error' in authMaterial) {
    throw new SSHSessionError(authMaterial.error)
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'seaturtle-ssh-local-'))
  const workflowHandoffPath = options.workflowHandoffJson
    ? join(tempDir, WORKFLOW_HANDOFF_FILENAME)
    : null
  if (workflowHandoffPath) {
    writeFileSync(workflowHandoffPath, options.workflowHandoffJson!)
  }
  if (authMaterial.codexAuthJson) {
    mkdirSync(join(tempDir, 'codex-home'), { recursive: true })
    writeFileSync(join(tempDir, 'codex-home', 'auth.json'), authMaterial.codexAuthJson)
  }

  const cliArgs = appendWorkflowHandoffCliArgs(
    collectRemoteCliArgs(options),
    workflowHandoffPath,
    options.replaceWorkflowHandoff,
  )

  const env = {
    ...process.env,
    ...authMaterial.providerEnv,
    ...(authMaterial.codexAuthJson
      ? { CODEX_HOME: join(tempDir, 'codex-home') }
      : {}),
  }

  const local = localSpawnCommand()
  const proc = spawn(
    local.command,
    [...local.args, ...cliArgs],
    {
      cwd: options.cwd ?? process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )

  return createSessionObject({
    proc,
    remoteCwd: options.cwd ?? process.cwd(),
    cleanup: () => {
      rmSync(tempDir, { recursive: true, force: true })
    },
  })
}

export async function createSSHSession(
  options: CreateSSHSessionOptions,
  callbacks: ProgressCallbacks = {},
): Promise<SSHSession> {
  const authMaterial = await buildRemoteAuthMaterial()
  if ('error' in authMaterial) {
    throw new SSHSessionError(authMaterial.error)
  }

  callbacks.onProgress?.('Probing remote host')
  const probe = runChecked(
    'ssh',
    [options.host, 'sh', '-lc', 'uname -s && uname -m'],
  )
  const [unameSystem = '', unameArch = ''] = probe.stdout
    .trim()
    .split(/\r?\n/)
  const target = resolveRemoteTarget(unameSystem, unameArch)

  const compiledBinaryPath = compileArtifactForTarget(
    target,
    options.localVersion,
    callbacks.onProgress,
  )

  callbacks.onProgress?.('Preparing remote workspace')
  const remoteDir = runChecked(
    'ssh',
    [options.host, 'sh', '-lc', 'mktemp -d "${TMPDIR:-/tmp}/seaturtle-ssh.XXXXXX"'],
  ).stdout.trim()
  if (!remoteDir) {
    throw new SSHSessionError('Failed to allocate a remote SeaTurtle temp directory.')
  }

  const remoteCwd = runChecked(
    'ssh',
    [
      options.host,
      'sh',
      '-lc',
      `cd ${quotePosix(options.cwd ?? '.')} >/dev/null 2>&1 && pwd`,
    ],
  ).stdout.trim()
  if (!remoteCwd) {
    throw new SSHSessionError(
      `Failed to resolve remote working directory: ${options.cwd ?? '.'}`,
    )
  }

  const workflowHandoffPath = options.workflowHandoffJson
    ? `${remoteDir}/${WORKFLOW_HANDOFF_FILENAME}`
    : null
  const cliArgs = appendWorkflowHandoffCliArgs(
    collectRemoteCliArgs(options),
    workflowHandoffPath,
    options.replaceWorkflowHandoff,
  )
  const launchScript = buildLaunchScript({
    remoteDir,
    remoteCwd,
    providerEnv: authMaterial.providerEnv,
    cliArgs,
    hasCodexAuth: !!authMaterial.codexAuthJson,
  })

  const localTempDir = mkdtempSync(join(tmpdir(), 'seaturtle-ssh-stage-'))
  const localLaunchPath = join(localTempDir, 'launch.sh')
  writeFileSync(localLaunchPath, launchScript, { mode: 0o700 })
  const localWorkflowHandoffPath = options.workflowHandoffJson
    ? join(localTempDir, WORKFLOW_HANDOFF_FILENAME)
    : null
  if (localWorkflowHandoffPath) {
    writeFileSync(localWorkflowHandoffPath, options.workflowHandoffJson!)
  }

  try {
    callbacks.onProgress?.('Uploading SeaTurtle runtime')
    runChecked('scp', [compiledBinaryPath, `${options.host}:${remoteDir}/ct`], {
      stdio: 'inherit',
    })
    runChecked('scp', [localLaunchPath, `${options.host}:${remoteDir}/launch.sh`], {
      stdio: 'inherit',
    })
    if (localWorkflowHandoffPath && workflowHandoffPath) {
      runChecked(
        'scp',
        [localWorkflowHandoffPath, `${options.host}:${workflowHandoffPath}`],
        {
          stdio: 'inherit',
        },
      )
    }
    runChecked(
      'ssh',
      [options.host, 'sh', '-lc', `chmod 700 ${quotePosix(`${remoteDir}/ct`)} ${quotePosix(`${remoteDir}/launch.sh`)}`],
      { stdio: 'inherit' },
    )

    if (authMaterial.codexAuthJson) {
      const localAuthDir = join(localTempDir, 'codex-home')
      mkdirSync(localAuthDir, { recursive: true })
      const localAuthPath = join(localAuthDir, 'auth.json')
      writeFileSync(localAuthPath, authMaterial.codexAuthJson, { mode: 0o600 })
      runChecked(
        'ssh',
        [options.host, 'sh', '-lc', `mkdir -p ${quotePosix(`${remoteDir}/codex-home`)}`],
        { stdio: 'inherit' },
      )
      runChecked(
        'scp',
        [localAuthPath, `${options.host}:${remoteDir}/codex-home/auth.json`],
        { stdio: 'inherit' },
      )
    }
  } catch (error) {
    rmSync(localTempDir, { recursive: true, force: true })
    try {
      runChecked(
        'ssh',
        [options.host, 'sh', '-lc', `rm -rf ${quotePosix(remoteDir)}`],
      )
    } catch {
      // best effort cleanup
    }
    throw error
  }

  callbacks.onProgress?.('Launching remote SeaTurtle session')
  const proc = spawn(
    'ssh',
    ['-T', options.host, `${remoteDir}/launch.sh`],
    {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )

  rmSync(localTempDir, { recursive: true, force: true })

  return createSessionObject({
    proc,
    remoteCwd,
    cleanup: () => {
      if (!proc.killed) {
        proc.kill('SIGTERM')
      }
      try {
        runChecked(
          'ssh',
          [options.host, 'sh', '-lc', `rm -rf ${quotePosix(remoteDir)}`],
        )
      } catch (error) {
        logForDebugging(
          `[createSSHSession] remote cleanup failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    },
  })
}
