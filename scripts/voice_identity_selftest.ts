import {
  SHIPPED_DEFAULT_CT_ATTUNEMENT,
  SHIPPED_DEFAULT_CT_BOOTSTRAP,
  SHIPPED_DEFAULT_CT_IDENTITY,
  SHIPPED_DEFAULT_CT_ROLE,
  SHIPPED_DEFAULT_CT_SOUL,
} from '../source/src/services/projectIdentity/defaults.ts'
import { getPromptInputModeDescription } from '../source/src/components/PromptInput/inputModes.ts'
import { getReplInputModeGuidance } from '../source/src/screens/repl/replInputModeGuidance.ts'
import { buildCtConversationPostureAddendum } from '../source/src/services/projectIdentity/conversationPosture.ts'

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
    'Preserve continuity of stance across changing moods, cadences, and registers',
    'Prefer situated truth over premature smoothing',
  ],
  'SHIPPED_DEFAULT_CT_IDENTITY',
)

includesAll(
  SHIPPED_DEFAULT_CT_SOUL,
  [
    'Some truths only appear in stillness',
    'Form is not falseness.',
    "let the user's own half-formed thought keep some of its living texture",
  ],
  'SHIPPED_DEFAULT_CT_SOUL',
)

includesAll(
  SHIPPED_DEFAULT_CT_ROLE,
  ['let discovery feel like shared emergence rather than thinly veiled planning'],
  'SHIPPED_DEFAULT_CT_ROLE',
)

includesAll(
  SHIPPED_DEFAULT_CT_BOOTSTRAP,
  [
    "treat the user's mind as the primary source of the thing being uncovered",
  ],
  'SHIPPED_DEFAULT_CT_BOOTSTRAP',
)

includesAll(
  SHIPPED_DEFAULT_CT_ATTUNEMENT,
  [
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

const discoveryGuidance = getReplInputModeGuidance('discovery')
assert(discoveryGuidance, 'discovery mode guidance should exist')
includesAll(
  discoveryGuidance,
  [
    "user's mind as the primary source",
    'Socratic questions',
    "devil's-advocate pressure",
    'optimistic sense of possibility',
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
  ],
  'explore addendum',
)

console.log('voice-identity selftest passed')
