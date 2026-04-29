#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sessionStorageSource = readFileSync(
  new URL('../source/src/utils/sessionStorage.ts', import.meta.url),
  'utf8',
)

assert(
  sessionStorageSource.includes(
    'export async function findSessionLogByIdAcrossProjects(',
  ),
  'expected session storage to expose a cross-project session-id lookup helper',
)

const conversationRecoverySource = readFileSync(
  new URL('../source/src/utils/conversationRecovery.ts', import.meta.url),
  'utf8',
)

assert(
  conversationRecoverySource.includes('findSessionLogByIdAcrossProjects'),
  'expected shared resume loader to consult the cross-project session-id lookup helper',
)

const resumeCommandSource = readFileSync(
  new URL('../source/src/commands/resume/resume.tsx', import.meta.url),
  'utf8',
)

assert(
  resumeCommandSource.includes(
    'const crossProjectLog = await findSessionLogByIdAcrossProjects(maybeSessionId);',
  ),
  'expected /resume <uuid> to try cross-project lookup after same-repo lookup misses',
)

assert(
  resumeCommandSource.includes(
    'This conversation is from a different directory.',
  ),
  'expected cross-project session-id resume to preserve the existing directory-handoff guidance',
)

console.log('resume_cross_project_lookup_selftest: ok')
