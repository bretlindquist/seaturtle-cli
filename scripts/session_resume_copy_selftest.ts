import {
  getSessionResumeAffordanceText,
  getSessionResumeTipText,
} from '../source/src/services/sessionResume/sessionResumeCopy.ts'

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

console.log('session-resume-copy selftest passed')
