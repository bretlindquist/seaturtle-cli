import assert from 'node:assert/strict'

import {
  projectSystemContextForAutoworkProfile,
  projectSystemPromptForAutoworkProfile,
  projectUserContextForAutoworkProfile,
  resolveAutoworkPromptProfile,
} from '../source/src/services/autowork/promptProfile.js'

const activeProfile = resolveAutoworkPromptProfile({
  currentInput: 'autowork for 8 hours',
  workflowRuntime: null,
})
assert.equal(activeProfile.kind, 'autowork-lean')

const defaultProfile = resolveAutoworkPromptProfile({
  currentInput: 'tell me how autowork works',
  workflowRuntime: null,
})
assert.equal(defaultProfile.kind, 'default')

const filteredPrompt = projectSystemPromptForAutoworkProfile(activeProfile, [
  '# System\n- core',
  '# Tone and style\n- personality',
  '# Internal voice invariants\n- soul',
  '# Output efficiency\n- keep it tight',
])
assert.deepEqual(filteredPrompt, [
  '# System\n- core',
  '# Output efficiency\n- keep it tight',
])

const filteredUserContext = projectUserContextForAutoworkProfile(activeProfile, {
  currentDate: "Today's date is 2026-05-01.",
  claudeMd: [
    'Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.',
    '',
    "Contents of /repo/AGENTS.md (project instructions, checked into the codebase):",
    '',
    '# Keep research first',
    '',
    "Contents of /repo/CLAUDE.local.md (user's private project instructions, not checked in):",
    '',
    '@.ct/router.md',
    '',
    "Contents of /repo/.ct/identity.md (user's private project instructions, not checked in):",
    '',
    '# CT Identity',
  ].join('\n'),
})
assert.match(String(filteredUserContext.claudeMd), /\/repo\/AGENTS\.md/)
assert.doesNotMatch(String(filteredUserContext.claudeMd), /\/repo\/\.ct\/identity\.md/)
assert.doesNotMatch(String(filteredUserContext.claudeMd), /\/repo\/CLAUDE\.local\.md/)

const filteredSystemContext = projectSystemContextForAutoworkProfile(
  activeProfile,
  {
    gitStatus: 'branch stuff',
    cacheBreaker: '[CACHE_BREAKER: test]',
  },
)
assert.deepEqual(filteredSystemContext, {
  cacheBreaker: '[CACHE_BREAKER: test]',
})

console.log('autowork token efficiency selftest passed')
