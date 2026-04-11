import {
  hasExplicitSessionResumeRequest,
  shouldStartFreshSession,
} from '../source/src/services/sessionResume/sessionEntryPolicy.ts'

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
    remoteValue: [],
  }),
  '--remote should count as an explicit non-fresh session-entry request',
)

console.log('session-entry-policy selftest passed')
