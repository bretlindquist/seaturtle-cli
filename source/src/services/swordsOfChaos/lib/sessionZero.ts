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
    ? `On the stair you pass someone with ${SWORDS_SEATURTLE_CHARACTER_CANON.bearing}. At the edge of your vision the face reads oddly calm, almost shelled in the way it holds itself. ${SWORDS_SEATURTLE_CHARACTER_CANON.name} catches you looking and answers with a measured wink, as if the two of you have just shared a secret neither of you plans to explain.`
    : `Someone pauses in the hall outside your door, then moves on before the old boards can give them away.`

  return {
    title: `${character.name ?? 'Nameless'}: Session 0`,
    subtitle:
      'The world takes its first look at you. All you have to do is arrive with your eyes open.',
    originPlace,
    firstContact,
    sceneText: `${character.name ?? 'You'} wake in ${originPlace}. Rain works the sill. A pipe knocks somewhere behind the wall. ${character.keepsake ?? 'Your keepsake'} is where you left it, which counts as mercy in a world that likes to move things when people sleep.\n\nYou come from ${character.origin ?? 'somewhere difficult'}, and it still shows in the way you lean on ${character.strength ?? 'your best quality'} whenever ${character.flaw ?? 'your worst habit'} starts arguing for a turn at the wheel.\n\nBy the time you step to the door, the day already feels like it has made room for you on purpose. That is either luck, danger, or the sort of invitation wise people learn to fear too late.\n\n${crossingText}`,
    hintText:
      'Choose the first move that tells the world what kind of trouble you are likely to become.',
    options: [
      {
        id: 'step-into-the-street',
        label: 'Step into the street',
        description: `Carry ${character.drive ?? 'your private reason'} into the weather and see what notices first.`,
      },
      {
        id: 'linger-at-the-threshold',
        label: 'Linger at the threshold',
        description:
          'Stay one breath longer and catch whatever the room almost kept from you.',
      },
      {
        id: 'follow-the-stranger',
        label: seaTurtleCrossing ? 'Follow the stranger a little way' : 'Follow the sound downstairs',
        description: seaTurtleCrossing
          ? 'Do not call out. Just see where that composed figure goes and whether they expected you to notice.'
          : 'Go toward the first sound in the building that seems more awake than the rest.',
      },
    ],
  }
}
