/**
 * Semver comparison utilities that use Bun.semver when available
 * and fall back to the npm `semver` package in Node.js environments.
 *
 * Bun.semver.order() is ~20x faster than npm semver comparisons.
 * The npm semver fallback always uses { loose: true }.
 */

let _npmSemver: typeof import('semver') | undefined

function getNpmSemver(): typeof import('semver') {
  if (!_npmSemver) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _npmSemver = require('semver') as typeof import('semver')
  }
  return _npmSemver
}

function normalizeVersionForComparison(version: string): string {
  const trimmed = version.trim().replace(/^v/i, '')
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?([+-].*)?$/.exec(trimmed)
  if (!match) {
    return version
  }

  const [, major, minor, patch, suffix = ''] = match
  return `${Number(major)}.${Number(minor)}.${patch === undefined ? 0 : Number(patch)}${suffix}`
}

export function gt(a: string, b: string): boolean {
  const normalizedA = normalizeVersionForComparison(a)
  const normalizedB = normalizeVersionForComparison(b)
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(normalizedA, normalizedB) === 1
  }
  return getNpmSemver().gt(normalizedA, normalizedB, { loose: true })
}

export function gte(a: string, b: string): boolean {
  const normalizedA = normalizeVersionForComparison(a)
  const normalizedB = normalizeVersionForComparison(b)
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(normalizedA, normalizedB) >= 0
  }
  return getNpmSemver().gte(normalizedA, normalizedB, { loose: true })
}

export function lt(a: string, b: string): boolean {
  const normalizedA = normalizeVersionForComparison(a)
  const normalizedB = normalizeVersionForComparison(b)
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(normalizedA, normalizedB) === -1
  }
  return getNpmSemver().lt(normalizedA, normalizedB, { loose: true })
}

export function lte(a: string, b: string): boolean {
  const normalizedA = normalizeVersionForComparison(a)
  const normalizedB = normalizeVersionForComparison(b)
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(normalizedA, normalizedB) <= 0
  }
  return getNpmSemver().lte(normalizedA, normalizedB, { loose: true })
}

export function satisfies(version: string, range: string): boolean {
  const normalizedVersion = normalizeVersionForComparison(version)
  if (typeof Bun !== 'undefined') {
    return Bun.semver.satisfies(normalizedVersion, range)
  }
  return getNpmSemver().satisfies(normalizedVersion, range, { loose: true })
}

export function order(a: string, b: string): -1 | 0 | 1 {
  const normalizedA = normalizeVersionForComparison(a)
  const normalizedB = normalizeVersionForComparison(b)
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(normalizedA, normalizedB)
  }
  return getNpmSemver().compare(normalizedA, normalizedB, { loose: true })
}
