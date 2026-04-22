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

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--outdir') {
      outdir = path.resolve(argv[index + 1] ?? '')
      index += 1
      continue
    }
    if (arg === '-h' || arg === '--help') {
      console.log(`Usage: node scripts/build-release-artifact.mjs [--outdir DIR]

Build the current platform's production SeaTurtle artifact from dist/cli.js.
Outputs:
  seaturtle-<platform>.tar.gz
  seaturtle-<platform>.tar.gz.sha256
`)
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return { outdir }
}

function getPlatformId() {
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

  throw new Error(`Unsupported release artifact platform: ${process.platform}`)
}

function requireCommand(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], {
    stdio: 'ignore',
  })
  if (result.status !== 0) {
    throw new Error(`${command} is required to build release artifacts`)
  }
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

const { outdir } = parseArgs(process.argv.slice(2))

if (!fs.existsSync(distCliPath)) {
  throw new Error(
    'dist/cli.js is missing. Build SeaTurtle first with: node scripts/build-cli.mjs --no-minify',
  )
}

requireCommand('bun')
requireCommand('tar')

const platformId = getPlatformId()
const binaryName = 'ct'
const archiveName = `seaturtle-${platformId}.tar.gz`
const archivePath = path.join(outdir, archiveName)
const checksumPath = `${archivePath}.sha256`
const tempDir = path.join(outdir, `.tmp-${platformId}-${Date.now()}`)
const compiledBinaryPath = path.join(tempDir, binaryName)

fs.mkdirSync(tempDir, { recursive: true })
fs.mkdirSync(outdir, { recursive: true })

console.log(`Building SeaTurtle release artifact for ${platformId}...`)
runChecked('bun', ['build', '--compile', distCliPath, '--outfile', compiledBinaryPath], {
  cwd: repoRoot,
})
runChecked('tar', ['-czf', archivePath, '-C', tempDir, binaryName], {
  cwd: repoRoot,
})

const checksum = sha256(archivePath)
fs.writeFileSync(checksumPath, `${checksum}  ${archiveName}\n`, 'utf8')
fs.rmSync(tempDir, { recursive: true, force: true })

console.log(`Wrote ${archivePath}`)
console.log(`Wrote ${checksumPath}`)
