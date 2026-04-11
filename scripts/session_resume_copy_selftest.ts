import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  getSessionResumeAffordanceText,
  getSessionResumeFeedFooterText,
  getNoResumableSessionsText,
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

const repoRoot = join(import.meta.dir, '..')
const resumeCommandSource = readFileSync(
  join(repoRoot, 'source/src/commands/resume/resume.tsx'),
  'utf8',
)

assert(
  resumeCommandSource.includes('onDone(getNoResumableSessionsText())'),
  '/resume should use the shared no-resumable copy in its empty-state picker path',
)
assert(
  !resumeCommandSource.includes("onDone('No conversations found to resume')"),
  '/resume should not keep a stale hardcoded no-resumable string',
)

console.log('session-resume-copy selftest passed')
