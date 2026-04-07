import { SWORDS_SESSION_ZERO_ORIGIN_PLACES, SWORDS_SESSION_ZERO_PRELUDE } from '../data/sessionZero.js'
import { SWORDS_SEATURTLE_CHARACTER_CANON } from '../data/seaturtleCharacter.js'
import type {
  SwordsOfChaosSessionZeroBuildOptions,
  SwordsOfChaosSessionZeroPrelude,
  SwordsOfChaosSessionZeroScene,
} from '../types/sessionZero.js'

function hashString(input: string): number {
  let hash = 0
  for (const char of input) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

function pickOriginPlace(seed: string): string {
  const index = hashString(seed) % SWORDS_SESSION_ZERO_ORIGIN_PLACES.length
  return SWORDS_SESSION_ZERO_ORIGIN_PLACES[index]!
}

function shouldCrossSeaTurtle(seed: string, allowSeaTurtleCrossing = true): boolean {
  if (!allowSeaTurtleCrossing) {
    return false
  }

  return hashString(seed) % 4 === 0
}

export function getSwordsSessionZeroPrelude(): SwordsOfChaosSessionZeroPrelude {
  return SWORDS_SESSION_ZERO_PRELUDE
}

export function buildSwordsSessionZeroScene({
  character,
  seed,
  allowSeaTurtleCrossing = true,
}: SwordsOfChaosSessionZeroBuildOptions): SwordsOfChaosSessionZeroScene {
  const basis = seed ?? `${character.name ?? 'nameless'}:${character.origin ?? 'unknown'}:${character.className ?? 'wanderer'}`
  const originPlace = pickOriginPlace(basis)
  const seaTurtleCrossing = shouldCrossSeaTurtle(basis, allowSeaTurtleCrossing)
  const firstContact = seaTurtleCrossing ? 'measured-wink' : null

  const crossingText = seaTurtleCrossing
    ? `On the stair you pass someone with ${SWORDS_SEATURTLE_CHARACTER_CANON.bearing}. For a second the face reads strangely from the edge of your vision, almost turtled in its calm. ${SWORDS_SEATURTLE_CHARACTER_CANON.name} notices your stare and answers it with a measured wink, as if the two of you have just agreed not to explain something yet.`
    : `Someone pauses in the hall outside your door as if listening for a name not yet spoken, then moves on before the boards can testify to it.`

  return {
    title: `${character.name ?? 'Nameless'}: Session 0`,
    subtitle:
      'The world takes a first look. You do not have to impress it yet, only arrive.',
    originPlace,
    firstContact,
    sceneText: `${character.name ?? 'You'} wake in ${originPlace}. You are ${character.className?.toLowerCase() ?? 'someone half-made'} enough to know the room by its sounds before its edges: rain at the sill, a pipe knocking somewhere two walls away, the small patient weight of ${character.keepsake ?? 'a keepsake'} where you left it last night.\n\nYou come from ${character.origin ?? 'somewhere difficult'}. That origin has not released you. It still shows up in the way you favor ${character.strength ?? 'your best quality'} and in the way ${character.flaw ?? 'your worst habit'} keeps asking for a vote.\n\nThis morning the world seems willing to start with atmosphere instead of violence. That is almost never free.\n\n${crossingText}`,
    hintText:
      'Session 0 should place your feet somewhere real before the pattern starts moving under them.',
    options: [
      {
        id: 'step-into-the-street',
        label: 'Step into the street',
        description: `Carry ${character.drive ?? 'your private reason'} into the weather and let the day admit you.`,
      },
      {
        id: 'linger-at-the-threshold',
        label: 'Linger at the threshold',
        description:
          'Stay one breath longer and notice what the room seems reluctant to forget.',
      },
      {
        id: 'follow-the-stranger',
        label: seaTurtleCrossing ? 'Follow the stranger a little way' : 'Follow the sound downstairs',
        description: seaTurtleCrossing
          ? 'Do not call attention to it. Just see where that composed figure vanishes.'
          : 'Move toward the first thing in the building that sounds more awake than you are.',
      },
    ],
  }
}
