import {
  buildSessionEntryPolicyInput,
  hasExplicitSessionResumeRequest,
  shouldStartFreshSession,
} from '../source/src/services/sessionResume/sessionEntryPolicy.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

assert(
  shouldStartFreshSession({
    continueFlag: false,
    resumeValue: undefined,
    fromPrValue: undefined,
    teleportValue: null,
    remoteValue: null,
  }),
  'plain startup should be fresh by default',
)

assert(
  shouldStartFreshSession({}),
  'omitted optional CLI flags should be treated as absent and fresh',
)

assert(
  shouldStartFreshSession({
    continueFlag: false,
    resumeValue: undefined,
    fromPrValue: undefined,
    teleportValue: undefined,
    remoteValue: undefined,
  }),
  'undefined optional CLI flags should not masquerade as explicit resume requests',
)

assert(
  hasExplicitSessionResumeRequest({
    continueFlag: true,
    remoteValue: null,
  }),
  '--continue should count as an explicit resume request',
)

assert(
  hasExplicitSessionResumeRequest({
    resumeValue: true,
    remoteValue: null,
  }),
  '--resume picker should count as an explicit resume request',
)

assert(
  hasExplicitSessionResumeRequest({
    resumeValue: 'session-id',
    remoteValue: null,
  }),
  '--resume <id> should count as an explicit resume request',
)

assert(
  hasExplicitSessionResumeRequest({
    fromPrValue: true,
    remoteValue: null,
  }),
  '--from-pr should count as an explicit session-entry request',
)

assert(
  hasExplicitSessionResumeRequest({
    teleportValue: 'remote-session',
    remoteValue: null,
  }),
  '--teleport should count as an explicit session-entry request',
)

assert(
  hasExplicitSessionResumeRequest({
    teleportValue: '',
    remoteValue: null,
  }),
  '--teleport without a session id should count as an explicit interactive session-entry request',
)

assert(
  hasExplicitSessionResumeRequest({
    remoteValue: [],
  }),
  '--remote should count as an explicit non-fresh session-entry request',
)

assert(
  hasExplicitSessionResumeRequest({
    remoteValue: '',
  }),
  '--remote without an initial prompt should still count as an explicit non-fresh session-entry request',
)

const sharedInput = buildSessionEntryPolicyInput({
  continueFlag: true,
  resumeValue: 'session-id',
  fromPrValue: true,
  teleportValue: 'remote-session',
  remoteValue: [],
})

assert(sharedInput.continueFlag === true, 'builder should preserve continueFlag')
assert(sharedInput.resumeValue === 'session-id', 'builder should preserve resumeValue')
assert(sharedInput.fromPrValue === true, 'builder should preserve fromPrValue')
assert(sharedInput.teleportValue === 'remote-session', 'builder should preserve teleportValue')
assert(Array.isArray(sharedInput.remoteValue), 'builder should preserve remoteValue')

const normalizedPlainStartup = buildSessionEntryPolicyInput({})
assert(
  normalizedPlainStartup.continueFlag === false,
  'builder should normalize missing continueFlag to false',
)
assert(
  normalizedPlainStartup.teleportValue === null,
  'builder should normalize missing teleportValue to null',
)
assert(
  normalizedPlainStartup.remoteValue === null,
  'builder should normalize missing remoteValue to null',
)

const repoRoot = join(import.meta.dir, '..')
const mainSource = readFileSync(join(repoRoot, 'source/src/main.tsx'), 'utf8')

assert(
  mainSource.includes('const sessionEntryPolicy = buildSessionEntryPolicyInput({'),
  'main.tsx should derive session-entry policy from the shared builder',
)
assert(
  mainSource.includes('shouldStartFreshSession(sessionEntryPolicy)'),
  'startup hook gating should use the shared session-entry policy object',
)
assert(
  mainSource.includes('hasExplicitSessionResumeRequest(sessionEntryPolicy)'),
  'resume routing should use the shared session-entry policy object',
)

console.log('session-entry-policy selftest passed')
