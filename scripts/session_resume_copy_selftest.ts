import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  getNoContinuableSessionText,
  getFailedResumeSessionText,
  getSessionResumeAffordanceText,
  getSessionResumeFeedFooterText,
  getNoResumableSessionsText,
  getNoSessionWithIdText,
  getSessionResumeTipText,
} from '../source/src/services/sessionResume/sessionResumeCopy.ts'
import {
  hasExplicitSessionResumeRequest,
  shouldStartFreshSession,
} from '../source/src/services/sessionResume/sessionEntryPolicy.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const affordance = getSessionResumeAffordanceText()
assert(
  affordance.includes('Fresh session by default.'),
  'resume affordance should make fresh-by-default explicit',
)
assert(
  affordance.includes('ct --continue'),
  'resume affordance should mention ct --continue',
)
assert(
  affordance.includes('ct --resume'),
  'resume affordance should mention ct --resume',
)
assert(
  affordance.includes('/resume'),
  'resume affordance should mention /resume inside CT',
)

const tip = getSessionResumeTipText()
assert(
  tip.includes('starts fresh by default'),
  'resume tip should reinforce fresh-by-default behavior',
)
assert(
  tip.includes('ct --continue') && tip.includes('ct --resume'),
  'resume tip should mention both explicit resume paths',
)

const feedFooter = getSessionResumeFeedFooterText()
assert(
  feedFooter === '/continue for last · /resume for picker',
  'recent activity footer should expose the canonical resume affordance',
)

const noResumable = getNoResumableSessionsText()
assert(
  noResumable.includes('/resume opens the picker'),
  'no-resume message should explain picker discovery',
)
assert(
  noResumable.includes('/continue resumes the most recent session'),
  'no-resume message should explain the direct continue path',
)

const noContinuable = getNoContinuableSessionText()
assert(
  noContinuable.includes('starts fresh by default'),
  'no-continue message should reinforce fresh-by-default behavior',
)
assert(
  noContinuable.includes('ct --continue') && noContinuable.includes('ct --resume'),
  'no-continue message should explain both explicit session-entry paths',
)

assert(
  getNoSessionWithIdText('session-id') ===
    'No conversation found with session ID: session-id',
  'session-id miss copy should be shared across CLI and print resume paths',
)
assert(
  getFailedResumeSessionText('session-id') === 'Failed to resume session session-id',
  'interactive resume failure copy should include the target session id',
)
assert(
  getFailedResumeSessionText() === 'Failed to resume session with --print mode',
  'print resume failure copy should preserve the generic fallback',
)

assert(
  shouldStartFreshSession({
    continueFlag: false,
    resumeValue: undefined,
    fromPrValue: undefined,
    teleportValue: null,
    remoteValue: null,
  }),
  'plain startup policy should remain fresh by default',
)
assert(
  shouldStartFreshSession({}),
  'plain startup policy should remain fresh when optional flags are omitted',
)
assert(
  hasExplicitSessionResumeRequest({
    continueFlag: true,
    remoteValue: null,
  }),
  'continue flag should route into explicit resume handling',
)
assert(
  hasExplicitSessionResumeRequest({
    resumeValue: 'session-id',
    remoteValue: null,
  }),
  'resume by id should route into explicit resume handling',
)
assert(
  hasExplicitSessionResumeRequest({
    remoteValue: [],
  }),
  'remote sessions should count as explicit non-fresh entrypoints',
)
assert(
  hasExplicitSessionResumeRequest({
    teleportValue: '',
    remoteValue: null,
  }),
  'interactive teleport picker should count as an explicit non-fresh entrypoint',
)

const repoRoot = join(import.meta.dir, '..')
const resumeCommandSource = readFileSync(
  join(repoRoot, 'source/src/commands/resume/resume.tsx'),
  'utf8',
)
const mainSource = readFileSync(join(repoRoot, 'source/src/main.tsx'), 'utf8')

assert(
  resumeCommandSource.includes('onDone(getNoResumableSessionsText())'),
  '/resume should use the shared no-resumable copy in its empty-state picker path',
)
assert(
  !resumeCommandSource.includes("onDone('No conversations found to resume')"),
  '/resume should not keep a stale hardcoded no-resumable string',
)
assert(
  mainSource.includes('exitWithError(root, getNoContinuableSessionText())'),
  '--continue should use the shared no-continue copy in its empty-state path',
)
assert(
  !mainSource.includes("exitWithError(root, 'No conversation found to continue')"),
  '--continue should not keep a stale hardcoded empty-state string',
)
assert(
  mainSource.includes('exitWithError(root, getNoSessionWithIdText(sessionId))'),
  '--resume <id> should use shared missing-session copy',
)
assert(
  mainSource.includes('exitWithError(root, getFailedResumeSessionText(sessionId))'),
  '--resume <id> should use shared failed-session copy',
)

const printSource = readFileSync(join(repoRoot, 'source/src/cli/print.ts'), 'utf8')
assert(
  printSource.includes('getNoSessionWithIdText(parsedSessionId.sessionId)'),
  'print-mode resume should use shared missing-session copy',
)
assert(
  printSource.includes('getFailedResumeSessionText()'),
  'print-mode resume should use shared generic failed-session copy',
)

console.log('session-resume-copy selftest passed')
