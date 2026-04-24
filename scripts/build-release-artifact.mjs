#!/usr/bin/env node
import { createHash } from 'crypto'
import fs from 'fs'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distCliPath = path.join(repoRoot, 'dist', 'cli.js')
const defaultOutdir = path.join(repoRoot, 'dist', 'release')

function parseArgs(argv) {
  let outdir = defaultOutdir
  let target = null

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--outdir') {
      outdir = path.resolve(argv[index + 1] ?? '')
      index += 1
      continue
    }
    if (arg === '--target') {
      target = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg === '-h' || arg === '--help') {
      console.log(`Usage: node scripts/build-release-artifact.mjs [--outdir DIR] [--target PLATFORM]

Build a production SeaTurtle artifact from dist/cli.js.
Outputs:
  seaturtle-<platform>.<archive-ext>
  seaturtle-<platform>.<archive-ext>.sha256

Supported platforms:
  darwin-arm64
  darwin-x64
  linux-arm64
  linux-x64
  windows-x64
`)
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return { outdir, target }
}

function getHostPlatformId() {
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x64' : null
  if (!arch) {
    throw new Error(`Unsupported release artifact architecture: ${process.arch}`)
  }

  if (process.platform === 'darwin') {
    return `darwin-${arch}`
  }

  if (process.platform === 'linux') {
    return `linux-${arch}`
  }

  if (process.platform === 'win32') {
    return `windows-${arch}`
  }

  throw new Error(`Unsupported release artifact platform: ${process.platform}`)
}

function getTargetConfig(platformId) {
  const targetMap = {
    'darwin-arm64': {
      bunTarget: 'bun-darwin-arm64',
      binaryName: 'ct',
      archiveExt: '.tar.gz',
    },
    'darwin-x64': {
      bunTarget: 'bun-darwin-x64',
      binaryName: 'ct',
      archiveExt: '.tar.gz',
    },
    'linux-arm64': {
      bunTarget: 'bun-linux-arm64',
      binaryName: 'ct',
      archiveExt: '.tar.gz',
    },
    'linux-x64': {
      bunTarget: 'bun-linux-x64',
      binaryName: 'ct',
      archiveExt: '.tar.gz',
    },
    'windows-x64': {
      bunTarget: 'bun-windows-x64',
      binaryName: 'ct.exe',
      archiveExt: '.zip',
    },
  }

  const config = targetMap[platformId]
  if (!config) {
    throw new Error(`Unsupported release artifact target: ${platformId}`)
  }
  return { platformId, ...config }
}

function packageArtifact({ archiveExt, archivePath, tempDir, binaryName, pythonCommand }) {
  if (archiveExt === '.tar.gz') {
    runChecked('tar', ['-czf', archivePath, '-C', tempDir, binaryName], {
      cwd: repoRoot,
    })
    return
  }

  if (archiveExt === '.zip') {
    runChecked(
      pythonCommand,
      [
        '-c',
        `import pathlib, zipfile\nbase = pathlib.Path(r'''${tempDir}''')\ntarget = pathlib.Path(r'''${archivePath}''')\nwith zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as zf:\n    zf.write(base / r'''${binaryName}''', r'''${binaryName}''')`,
      ],
      { cwd: repoRoot },
    )
    return
  }

  throw new Error(`Unsupported archive format: ${archiveExt}`)
}

function getRequiredCommands(archiveExt) {
  if (archiveExt === '.zip') {
    return ['bun']
  }

  if (archiveExt === '.tar.gz') {
    return ['bun', 'tar']
  }

  throw new Error(`Unsupported archive format: ${archiveExt}`)
}

function hasCommand(command) {
  const result = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  return result.status === 0
}

function requireCommand(command) {
  if (!hasCommand(command)) {
    throw new Error(`${command} is required to build release artifacts`)
  }
}

function getPythonCommand() {
  for (const command of process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']) {
    if (hasCommand(command)) {
      return command
    }
  }

  throw new Error('python3 or python is required to build zip release artifacts')
}

function runChecked(command, args, options = {}) {
  const env = { ...process.env }
  if (env.LC_ALL === 'C.UTF-8') {
    delete env.LC_ALL
  }
  if (env.LC_CTYPE === 'C.UTF-8') {
    delete env.LC_CTYPE
  }
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function sha256(filePath) {
  const hash = createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

const { outdir, target } = parseArgs(process.argv.slice(2))

if (!fs.existsSync(distCliPath)) {
  throw new Error(
    'dist/cli.js is missing. Build SeaTurtle first with: node scripts/build-cli.mjs --no-minify',
  )
}

const targetConfig = getTargetConfig(target ?? getHostPlatformId())
for (const command of getRequiredCommands(targetConfig.archiveExt)) {
  requireCommand(command)
}

const archiveName = `seaturtle-${targetConfig.platformId}${targetConfig.archiveExt}`
const archivePath = path.join(outdir, archiveName)
const checksumPath = `${archivePath}.sha256`
const tempDir = path.join(outdir, `.tmp-${targetConfig.platformId}-${Date.now()}`)
const compiledBinaryPath = path.join(tempDir, targetConfig.binaryName)

fs.mkdirSync(tempDir, { recursive: true })
fs.mkdirSync(outdir, { recursive: true })

console.log(`Building SeaTurtle release artifact for ${targetConfig.platformId}...`)
runChecked(
  'bun',
  [
    'build',
    '--compile',
    distCliPath,
    '--target',
    targetConfig.bunTarget,
    '--outfile',
    compiledBinaryPath,
  ],
  {
    cwd: repoRoot,
  },
)
packageArtifact({
  archiveExt: targetConfig.archiveExt,
  archivePath,
  tempDir,
  binaryName: targetConfig.binaryName,
  pythonCommand: targetConfig.archiveExt === '.zip' ? getPythonCommand() : null,
})

const checksum = sha256(archivePath)
fs.writeFileSync(checksumPath, `${checksum}  ${archiveName}\n`, 'utf8')
fs.rmSync(tempDir, { recursive: true, force: true })

console.log(`Wrote ${archivePath}`)
console.log(`Wrote ${checksumPath}`)
