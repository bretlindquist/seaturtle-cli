import { createHash } from 'crypto'
import { execFile, spawn } from 'child_process'
import {
  chmod,
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { promisify } from 'util'
import { getErrnoCode } from './errors.js'
import { getXDGDataHome } from './xdg.js'

const DEFAULT_RELEASE_REPO = 'bretlindquist/seaturtle-cli'
const DEFAULT_RELEASE_API_BASE = 'https://api.github.com/repos'
const DEFAULT_RELEASE_WEB_BASE = 'https://github.com'
const INSTALL_METADATA_DIR_NAME = 'seaturtle'
const INSTALL_METADATA_FILE_NAME = 'install.json'
const execFileAsync = promisify(execFile)

export type GitHubReleaseInstallMetadata = {
  type: 'github-release'
  repo: string
  installedPath: string
  version: string
  installedAt: string
}

export function normalizeSeaTurtleReleaseVersionTag(version: string): string {
  return version.startsWith('v') ? version : `v${version}`
}

export function getSeaTurtleReleaseRepo(): string {
  return process.env.SEATURTLE_RELEASE_REPO ?? DEFAULT_RELEASE_REPO
}

function getSeaTurtleReleaseApiBase(): string {
  return process.env.SEATURTLE_RELEASE_API_BASE_URL ?? DEFAULT_RELEASE_API_BASE
}

function getSeaTurtleReleaseWebBase(): string {
  return process.env.SEATURTLE_RELEASE_WEB_BASE_URL ?? DEFAULT_RELEASE_WEB_BASE
}

export function getSeaTurtleReleaseInstallMetadataPath(): string {
  return join(
    getXDGDataHome(),
    INSTALL_METADATA_DIR_NAME,
    INSTALL_METADATA_FILE_NAME,
  )
}

export function getSeaTurtleReleasePlatformId(): string {
  const arch =
    process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x64' : null

  if (!arch) {
    throw new Error(
      `Unsupported production release architecture: ${process.arch}`,
    )
  }

  if (process.platform === 'darwin') {
    return `darwin-${arch}`
  }

  if (process.platform === 'linux') {
    return `linux-${arch}`
  }

  if (process.platform === 'win32') {
    if (arch !== 'x64') {
      throw new Error(
        `Unsupported production release architecture on Windows: ${process.arch}`,
      )
    }
    return `windows-${arch}`
  }

  throw new Error(`Unsupported production release platform: ${process.platform}`)
}

export function isSeaTurtleWindowsReleasePlatform(platform: string): boolean {
  return platform.startsWith('windows-')
}

export function getSeaTurtleReleaseAssetName(platform: string): string {
  return `seaturtle-${platform}${isSeaTurtleWindowsReleasePlatform(platform) ? '.zip' : '.tar.gz'}`
}

export function getSeaTurtleReleaseChecksumAssetName(platform: string): string {
  return `${getSeaTurtleReleaseAssetName(platform)}.sha256`
}

export function getSeaTurtleReleaseBinaryName(platform: string): string {
  return isSeaTurtleWindowsReleasePlatform(platform) ? 'ct.exe' : 'ct'
}

function getSeaTurtleReleaseApiUrl(versionOrChannel: string): string {
  const repo = getSeaTurtleReleaseRepo()
  const apiBase = getSeaTurtleReleaseApiBase()
  if (versionOrChannel === 'latest' || versionOrChannel === 'stable') {
    return `${apiBase}/${repo}/releases/latest`
  }

  return `${apiBase}/${repo}/releases/tags/${normalizeSeaTurtleReleaseVersionTag(versionOrChannel)}`
}

function getSeaTurtleReleaseDownloadBase(versionOrChannel: string): string {
  const repo = getSeaTurtleReleaseRepo()
  const webBase = getSeaTurtleReleaseWebBase()
  if (versionOrChannel === 'latest' || versionOrChannel === 'stable') {
    return `${webBase}/${repo}/releases/latest/download`
  }

  return `${webBase}/${repo}/releases/download/${normalizeSeaTurtleReleaseVersionTag(versionOrChannel)}`
}

export async function getLatestSeaTurtleReleaseVersion(): Promise<string | null> {
  try {
    const response = await fetch(getSeaTurtleReleaseApiUrl('latest'), {
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as { tag_name?: unknown }
    const tagName = data.tag_name
    if (typeof tagName !== 'string' || tagName.length === 0) {
      return null
    }

    return tagName.startsWith('v') ? tagName.slice(1) : tagName
  } catch {
    return null
  }
}

export async function readGitHubReleaseInstallMetadata(): Promise<GitHubReleaseInstallMetadata | null> {
  try {
    const raw = await readFile(getSeaTurtleReleaseInstallMetadataPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<GitHubReleaseInstallMetadata>
    if (
      parsed.type !== 'github-release' ||
      typeof parsed.repo !== 'string' ||
      typeof parsed.installedPath !== 'string' ||
      typeof parsed.version !== 'string' ||
      typeof parsed.installedAt !== 'string'
    ) {
      return null
    }

    return {
      type: 'github-release',
      repo: parsed.repo,
      installedPath: parsed.installedPath,
      version: parsed.version,
      installedAt: parsed.installedAt,
    }
  } catch (error) {
    if (getErrnoCode(error) !== 'ENOENT') {
    }
    return null
  }
}

export async function isRunningFromGitHubReleaseInstall(): Promise<boolean> {
  const metadata = await readGitHubReleaseInstallMetadata()
  if (!metadata) {
    return false
  }

  try {
    const [execPath, installedPath] = await Promise.all([
      realpath(process.execPath),
      realpath(metadata.installedPath),
    ])
    return execPath === installedPath
  } catch {
    return false
  }
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5 * 60 * 1000),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to download SeaTurtle release asset: ${response.status} ${response.statusText}`,
    )
  }
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()))
}

async function verifyArchiveChecksum(
  archivePath: string,
  checksumPath: string,
): Promise<void> {
  const [archive, checksumFile] = await Promise.all([
    readFile(archivePath),
    readFile(checksumPath, 'utf8'),
  ])

  const expectedChecksum = checksumFile.trim().split(/\s+/)[0]
  const actualChecksum = createHash('sha256').update(archive).digest('hex')

  if (!expectedChecksum || expectedChecksum !== actualChecksum) {
    throw new Error(
      `SeaTurtle release checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`,
    )
  }
}

async function extractReleaseArchive(
  archivePath: string,
  destinationDir: string,
  platform: string,
): Promise<void> {
  if (isSeaTurtleWindowsReleasePlatform(platform)) {
    try {
      await execFileAsync(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          "$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
          archivePath,
          destinationDir,
        ],
        {
          timeout: 60_000,
          windowsHide: true,
        },
      )
      return
    } catch (error) {
      const extracted = error as {
        stdout?: string
        stderr?: string
        message?: string
      }
      throw new Error(
        `Failed to extract SeaTurtle release archive: ${extracted.stdout ?? ''} ${extracted.stderr ?? extracted.message ?? ''}`.trim(),
      )
    }
  }

  try {
    await execFileAsync('tar', ['-xzf', archivePath, '-C', destinationDir], {
      timeout: 60_000,
    })
  } catch (error) {
    const extracted = error as {
      stdout?: string
      stderr?: string
      message?: string
    }
    throw new Error(
      `Failed to extract SeaTurtle release archive: ${extracted.stdout ?? ''} ${extracted.stderr ?? extracted.message ?? ''}`.trim(),
    )
  }
}

function formatPowerShellStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function serializeGitHubReleaseInstallMetadata(
  metadata: GitHubReleaseInstallMetadata,
): string {
  return JSON.stringify(metadata, null, 2) + '\n'
}

async function stageWindowsInstalledBinaryReplacement(options: {
  extractedBinaryPath: string
  installedPath: string
  metadata: GitHubReleaseInstallMetadata
  cleanupDir: string
}): Promise<void> {
  const { extractedBinaryPath, installedPath, metadata, cleanupDir } = options
  await mkdir(dirname(installedPath), { recursive: true })

  const metadataPath = getSeaTurtleReleaseInstallMetadataPath()
  await mkdir(dirname(metadataPath), { recursive: true })

  const stagedMetadataPath = join(cleanupDir, INSTALL_METADATA_FILE_NAME)
  await writeFile(
    stagedMetadataPath,
    serializeGitHubReleaseInstallMetadata(metadata),
  )

  const script = [
    '$ErrorActionPreference = "Stop"',
    `$source = ${formatPowerShellStringLiteral(extractedBinaryPath)}`,
    `$target = ${formatPowerShellStringLiteral(installedPath)}`,
    `$metadataSource = ${formatPowerShellStringLiteral(stagedMetadataPath)}`,
    `$metadataTarget = ${formatPowerShellStringLiteral(metadataPath)}`,
    `$cleanupDir = ${formatPowerShellStringLiteral(cleanupDir)}`,
    'for ($attempt = 0; $attempt -lt 120; $attempt += 1) {',
    '  try {',
    '    Copy-Item -LiteralPath $source -Destination $target -Force',
    '    Copy-Item -LiteralPath $metadataSource -Destination $metadataTarget -Force',
    '    Remove-Item -LiteralPath $cleanupDir -Recurse -Force -ErrorAction SilentlyContinue',
    '    exit 0',
    '  } catch {',
    '    Start-Sleep -Seconds 1',
    '  }',
    '}',
    'exit 1',
  ].join('; ')

  const child = spawn(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle',
      'Hidden',
      '-Command',
      script,
    ],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    },
  )
  child.unref()
}

async function replaceInstalledBinary(
  extractedBinaryPath: string,
  installedPath: string,
): Promise<void> {
  await mkdir(dirname(installedPath), { recursive: true })
  const tempInstallPath = `${installedPath}.tmp.${process.pid}.${Date.now()}`
  await copyFile(extractedBinaryPath, tempInstallPath)
  await chmod(tempInstallPath, 0o755)
  await rename(tempInstallPath, installedPath)
}

async function writeGitHubReleaseInstallMetadata(
  metadata: GitHubReleaseInstallMetadata,
): Promise<void> {
  const metadataPath = getSeaTurtleReleaseInstallMetadataPath()
  await mkdir(dirname(metadataPath), { recursive: true })
  await writeFile(
    metadataPath,
    serializeGitHubReleaseInstallMetadata(metadata),
  )
}

export async function installGitHubReleaseBinary(options?: {
  version?: string
  installedPath?: string
}): Promise<string> {
  const version =
    options?.version ?? (await getLatestSeaTurtleReleaseVersion()) ?? null
  if (!version) {
    throw new Error('Could not determine the latest SeaTurtle release version')
  }

  const metadata = await readGitHubReleaseInstallMetadata()
  const installedPath = options?.installedPath ?? metadata?.installedPath
  if (!installedPath) {
    throw new Error(
      'Could not determine where SeaTurtle was installed. Reinstall with the release installer first.',
    )
  }

  const platform = getSeaTurtleReleasePlatformId()
  const archiveName = getSeaTurtleReleaseAssetName(platform)
  const checksumName = getSeaTurtleReleaseChecksumAssetName(platform)
  const downloadBase = getSeaTurtleReleaseDownloadBase(version)
  const tempDir = await mkdtemp(join(tmpdir(), 'seaturtle-release-update-'))
  const archivePath = join(tempDir, archiveName)
  const checksumPath = join(tempDir, checksumName)
  const extractedBinaryPath = join(
    tempDir,
    getSeaTurtleReleaseBinaryName(platform),
  )
  const installMetadata: GitHubReleaseInstallMetadata = {
    type: 'github-release',
    repo: getSeaTurtleReleaseRepo(),
    installedPath,
    version,
    installedAt: new Date().toISOString(),
  }
  let shouldPreserveTempDir = false

  try {
    await downloadFile(`${downloadBase}/${archiveName}`, archivePath)
    await downloadFile(`${downloadBase}/${checksumName}`, checksumPath)
    await verifyArchiveChecksum(archivePath, checksumPath)
    await extractReleaseArchive(archivePath, tempDir, platform)
    if (isSeaTurtleWindowsReleasePlatform(platform)) {
      shouldPreserveTempDir = true
      await stageWindowsInstalledBinaryReplacement({
        extractedBinaryPath,
        installedPath,
        metadata: installMetadata,
        cleanupDir: tempDir,
      })
    } else {
      await replaceInstalledBinary(extractedBinaryPath, installedPath)
      await writeGitHubReleaseInstallMetadata(installMetadata)
    }
    return version
  } finally {
    if (!shouldPreserveTempDir) {
      await rm(tempDir, { recursive: true, force: true })
    }
  }
}
