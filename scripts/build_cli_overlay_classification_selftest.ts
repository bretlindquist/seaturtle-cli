#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')
const source = readFileSync(join(repoRoot, 'scripts', 'build-cli.mjs'), 'utf8')
const overlaySection = source.slice(
  source.indexOf('const coreOverlayDependencyPackages = ['),
  source.indexOf('const overlayManagedPackages = new Set(baseOverlayDependencyPackages);'),
)

for (const groupName of [
  'coreOverlayDependencyPackages',
  'providerOverlayDependencyPackages',
  'telemetryOverlayDependencyPackages',
  'transitiveRuntimeOverlayDependencyPackages',
]) {
  assert.match(
    source,
    new RegExp(`const ${groupName} = \\[`),
    `build-cli should define ${groupName}`,
  )
}

for (const removedPackage of [
  '@azure/msal-node',
  '@azure/msal-common',
  '@smithy/eventstream-serde-node',
  '@smithy/fetch-http-handler',
  '@smithy/protocol-http',
  '@smithy/signature-v4',
  '@smithy/smithy-client',
  '@smithy/util-base64',
  '@typespec/ts-http-runtime',
  'detect-libc',
  'form-data',
  'fs-extra',
  'graceful-fs',
  'human-signals',
  'retry',
  'scheduler',
  'which',
]) {
  assert.doesNotMatch(
    overlaySection,
    new RegExp(`'${removedPackage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
    `build-cli should not keep ${removedPackage} in the default explicit overlay set`,
  )
}

for (const transitivePackage of ['@aws-sdk/client-sso', 'punycode']) {
  assert.match(
    source,
    new RegExp(
      `const transitiveRuntimeOverlayDependencyPackages = \\[[\\s\\S]*'${transitivePackage.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}'`,
    ),
    `build-cli should keep ${transitivePackage} in the transitive runtime overlay group`,
  )
}

assert.match(
  source,
  /const baseOverlayDependencyPackages = \[\s*...coreOverlayDependencyPackages,\s*...providerOverlayDependencyPackages,\s*...telemetryOverlayDependencyPackages,\s*...transitiveRuntimeOverlayDependencyPackages,\s*\]/s,
  'build-cli should assemble the base overlay set from explicit classified groups',
)

console.log('build-cli-overlay-classification selftest passed')
