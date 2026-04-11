import {
  SHIPPED_DEFAULT_CT_ATTUNEMENT,
  SHIPPED_DEFAULT_CT_BOOTSTRAP,
  SHIPPED_DEFAULT_CT_IDENTITY,
  SHIPPED_DEFAULT_CT_ROLE,
  SHIPPED_DEFAULT_CT_SOUL,
} from '../source/src/services/projectIdentity/defaults.ts'
import { getPromptInputModeDescription } from '../source/src/components/PromptInput/inputModes.ts'
import { getReplInputModeGuidance } from '../source/src/screens/repl/replInputModeGuidance.ts'
import {
  buildCtConversationPostureAddendum,
  classifyCtConversationPosture,
} from '../source/src/services/projectIdentity/conversationPosture.ts'
import { buildGuidedCtIdentity } from '../source/src/services/projectIdentity/templates.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function includesAll(text: string, needles: string[], label: string): void {
  for (const needle of needles) {
    assert(text.includes(needle), `${label} is missing expected text: ${needle}`)
  }
}

includesAll(
  SHIPPED_DEFAULT_CT_IDENTITY,
  [
    'do not create motion just to avoid stillness',
    'discovery surfaces, connects, and tests',
    'research gathers evidence',
    'planning sequences',
    'Prefer intent before ambience',
    'do not force a deliverable-shaped answer',
    'Preserve continuity of stance across changing moods, cadences, and registers',
    'Prefer situated truth over premature smoothing',
  ],
  'SHIPPED_DEFAULT_CT_IDENTITY',
)

includesAll(
  SHIPPED_DEFAULT_CT_SOUL,
  [
    'Strong at discovery before research is warranted',
    'merely signaling effort',
    'let a quiet moment stay quiet',
    'Some truths only appear in stillness',
    'Form is not falseness.',
    "let the user's own half-formed thought keep some of its living texture",
  ],
  'SHIPPED_DEFAULT_CT_SOUL',
)

includesAll(
  SHIPPED_DEFAULT_CT_ROLE,
  [
    'let discovery feel like shared emergence rather than thinly veiled planning',
    'do not confuse brainstorming with evidence-gathering',
  ],
  'SHIPPED_DEFAULT_CT_ROLE',
)

includesAll(
  SHIPPED_DEFAULT_CT_BOOTSTRAP,
  [
    "treat the user's mind as the primary source of the thing being uncovered",
    'In research moments, go outside the exchange for evidence',
    'In planning moments, translate a chosen direction',
  ],
  'SHIPPED_DEFAULT_CT_BOOTSTRAP',
)

includesAll(
  SHIPPED_DEFAULT_CT_ATTUNEMENT,
  [
    'helpful without hovering',
    'do not fill it just to feel useful',
    'let discovery stay shared and user-led long enough for the real shape to appear',
  ],
  'SHIPPED_DEFAULT_CT_ATTUNEMENT',
)

const discoveryDescription = getPromptInputModeDescription('discovery')
assert(
  discoveryDescription.includes('before they harden into research or planning'),
  'discovery mode description should describe its place before research/planning',
)
assert(
  getPromptInputModeDescription('research').includes('outside the exchange'),
  'research mode description should distinguish outside evidence gathering',
)
assert(
  getPromptInputModeDescription('planning').includes('chosen direction'),
  'planning mode description should distinguish chosen-direction sequencing',
)

const discoveryGuidance = getReplInputModeGuidance('discovery')
assert(discoveryGuidance, 'discovery mode guidance should exist')
includesAll(
  discoveryGuidance,
  [
    "user's mind as the primary source",
    'Socratic questions',
    "devil's-advocate pressure",
    'optimistic sense of possibility',
    'research-lite or planning-lite',
  ],
  'discovery mode guidance',
)

const exploreAddendum = buildCtConversationPostureAddendum({
  posture: 'explore',
  disposition: 'curious',
  currentInput: 'how should we shape this project before we commit to a plan?',
})

includesAll(
  exploreAddendum,
  [
    "user's own mind as the main landscape being explored",
    "devil's-advocate pressure",
    'discovery should feel like opening, not closing',
    'Keep discovery distinct from research and planning',
  ],
  'explore addendum',
)

assert(
  classifyCtConversationPosture({
    currentInput: 'can we brainstorm and connect the dots before we plan?',
  }) === 'explore',
  'brainstorming should classify as exploration/discovery posture',
)
assert(
  classifyCtConversationPosture({
    currentInput: 'lol what a world',
  }) === 'open',
  'light banter should stay open instead of becoming project steering',
)
assert(
  classifyCtConversationPosture({
    currentInput: 'fix source/src/services/projectIdentity/defaults.ts',
  }) === 'work',
  'explicit file-edit requests should classify as work',
)

const guidedIdentity = buildGuidedCtIdentity({
  role: 'planner',
  focus: 'caution',
  tone: 'straightforward',
  userNote: '  Bret likes direct, production-grade passes   with tests.  ',
})
includesAll(
  guidedIdentity.user,
  [
    '# CT User',
    'First-run note:',
    '- Bret likes direct, production-grade passes with tests.',
    'Do not build a dossier.',
  ],
  'guided CT user file',
)
assert(
  guidedIdentity.role.includes('research planner') &&
    guidedIdentity.soul.includes('Keep the tone clean, direct, and low-fluff.'),
  'guided CT identity should preserve selected role and tone',
)

const emptyGuidedIdentity = buildGuidedCtIdentity({
  role: 'builder',
  focus: 'speed',
  tone: 'lightly-playful',
})
assert(
  emptyGuidedIdentity.user.includes('No stable preference captured yet.'),
  'guided CT identity should keep empty first-run user notes explicit and non-invasive',
)

console.log('voice-identity selftest passed')
