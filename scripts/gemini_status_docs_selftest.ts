#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dirname, '..')

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8')
}

const authHandler = read('source/src/cli/handlers/auth.ts')
const status = read('source/src/utils/status.tsx')
const readme = read('README.md')
const geminiDocs = read('docs/GEMINI.md')
const featureRouter = read('docs/FEATURES-ROUTER.md')

assert.match(
  authHandler,
  /geminiCapabilityConfig/,
  'auth status JSON should expose Gemini capability configuration detail',
)
assert.match(
  authHandler,
  /hostedFileSearchConfigured/,
  'auth status JSON should distinguish configured Gemini file search from routed file search',
)
assert.match(
  authHandler,
  /urlContext:/,
  'auth status JSON should expose Gemini URL context capability truth',
)
assert.match(
  authHandler,
  /url_context_function_call_combination_limits/,
  'auth status JSON should expose the Gemini URL context combination gate',
)
assert.match(
  status,
  /label: 'Gemini file search'/,
  'status should show Gemini file-search readiness separately from routed support',
)
assert.match(
  status,
  /label: 'Gemini limits'/,
  'status should surface Gemini context and inline request limits',
)
assert.match(
  geminiDocs,
  /SEATURTLE_MAIN_PROVIDER=gemini/,
  'Gemini docs should use the SeaTurtle provider env names as the primary setup path',
)
assert.doesNotMatch(
  geminiDocs,
  /^Legacy `CLAUDE_CODE_MAIN_PROVIDER=gemini`/m,
  'Gemini docs should not present legacy Claude env names as the primary setup path',
)
assert.match(
  geminiDocs,
  /does not require a separate Google Search API key/i,
  'Gemini docs should state that routed Gemini web access does not require a second Search API key',
)
assert.match(
  geminiDocs,
  /falls back[\s\S]*WebFetch path/i,
  'Gemini docs should explain the local WebFetch fallback for unsupported URL-context targets',
)
assert.match(
  geminiDocs,
  /validated Gemini 3[\s\S]*routed path/i,
  'Gemini docs should explain that SeaTurtle currently routes URL context on the validated Gemini 3 path',
)
assert.match(
  geminiDocs,
  /documented Gemini support[\s\S]*routed SeaTurtle support/i,
  'Gemini docs should explain documented versus routed capability truth',
)
assert.match(
  geminiDocs,
  /gemini-live-text-check/,
  'Gemini docs should list the live validation commands',
)
assert.match(
  featureRouter,
  /Use `\/login` to set up Gemini in CT for interactive work/,
  'feature router should present /login as the primary interactive Gemini path',
)
assert.match(
  featureRouter,
  /GEMINI_API_KEY.*env-driven control or automation/,
  'feature router should keep GEMINI_API_KEY framed as explicit operator control, not the default interactive path',
)
assert.match(
  readme,
  /native Gemini runtime/,
  'README should describe Gemini as a native runtime, not an initial scaffold',
)
assert.match(
  readme,
  /does not require a separate Google[\s\S]*Search API key/i,
  'README should state that Gemini web access does not require a second Search API key',
)
assert.match(
  readme,
  /validated Gemini 3[\s\S]*routed path/i,
  'README should explain the current routed Gemini URL-context scope',
)

console.log('gemini-status-docs self-test passed')
