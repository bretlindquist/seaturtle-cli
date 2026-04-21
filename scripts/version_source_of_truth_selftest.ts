import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const rootPackage = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8'),
) as { version?: unknown }
const runtimePackage = JSON.parse(
  readFileSync(join(repoRoot, 'source/package.json'), 'utf8'),
) as { version?: unknown }
const buildScript = readFileSync(
  join(repoRoot, 'scripts/build-cli.mjs'),
  'utf8',
)
const wrapperScript = readFileSync(join(repoRoot, 'bin/ct'), 'utf8')

assert.equal(
  rootPackage.version,
  undefined,
  'root package.json should not carry a second CT version field',
)
assert.equal(
  runtimePackage.version,
  '1.09',
  'source/package.json should carry the shipped CT version',
)
assert.match(
  buildScript,
  /const installedPackageJson = path\.join\(sourceRoot, 'package\.json'\)/,
  'build script should derive the shipped version from source/package.json',
)
assert.match(
  wrapperScript,
  /package_json_path=\"\$repo_root\/source\/package\.json\"/,
  'local wrapper should read the repo version from source/package.json',
)

console.log('version source of truth self-test passed')
