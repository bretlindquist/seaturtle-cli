import type {
  SwordsOfChaosEncounterLocus,
  SwordsOfChaosWorldMapNode,
} from '../types/worldMap.js'

export const SWORDS_OF_CHAOS_WORLD_MAP: Record<
  SwordsOfChaosEncounterLocus,
  SwordsOfChaosWorldMapNode
> = {
  alley: {
    connectiveWeight:
      'The alley no longer feels like a single place. It feels like the narrow mouth of something larger that keeps surfacing elsewhere in other materials.',
    threadEchoes: {
      'half-shell-relic-trail':
        'A shell-green sheen keeps finding the chain, the lamp, and the wet brick as if some relic path passes through here before it goes elsewhere.',
      'broken-lamp-witnesses':
        'The broken lamp has stopped acting like local weather. It feels like one watchlight in a system of them.',
      'alley-oath-keepers':
        'The brickwork holds vows the way wood might hold rings, as if promises made here are only one root of a deeper structure.',
      'sign-truth-fractures':
        'The sign crackles with the same wrongness that later turns up in metal announcements and older names.',
      'quiet-refusals':
        'Every refusal here leaves a pressure ridge behind, as if the alley archives what people decline to become.',
    },
  },
  'old-tree': {
    connectiveWeight:
      'The tree does not feel separate from the alley. It feels like the same question translated into root, thorn, and damp soil.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Something shell-green lives in the latch under the bramble, the same hue that keeps haunting metal in other places.',
      'broken-lamp-witnesses':
        'Light finds you here the way it did under the broken lamp, as if the world keeps assigning the same witness a new perch.',
      'alley-oath-keepers':
        'The roots feel full of kept words. What the alley stored in posture, this place stores in growth.',
      'sign-truth-fractures':
        'Names here feel half-right in the same way the station announcements will later feel wrong, as if truth keeps cracking along the same grain.',
      'quiet-refusals':
        'The unopened latch feels like a refusal that learned to flower thorns around itself.',
    },
  },
  'ocean-ship': {
    connectiveWeight:
      'The ship feels like the same old pressure set loose in motion, carrying the alley and the tree forward under salt and iron.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Green corrosion blooms along the hatch like the relic trail finally found a place willing to move with it.',
      'broken-lamp-witnesses':
        'The lantern light watches with the same patience as the alley lamp, only now the witness sways with the sea.',
      'alley-oath-keepers':
        'The deck feels full of vows made far inland and kept badly at sea.',
      'sign-truth-fractures':
        'Even the hull seems to repeat the wrong name for itself, as if the same fracture keeps crossing materials.',
      'quiet-refusals':
        'Below deck, the knocking sounds like something refused entry too many times and no longer accepts the answer.',
    },
  },
  'space-station': {
    connectiveWeight:
      'The station does not replace the alley. It feels like the same structure expressed as pressure doors, frost, and failing light.',
    threadEchoes: {
      'half-shell-relic-trail':
        'A shell-green shimmer sits inside the frost and cable housings, the relic trail translated into circuitry and cold.',
      'broken-lamp-witnesses':
        'The strip-lights fail in the same rhythm the broken lamp once hummed, as if the same witness climbed into orbit.',
      'alley-oath-keepers':
        'The station holds promises like sealed air: invisible until something ruptures.',
      'sign-truth-fractures':
        'Wrong names and broken announcements belong here with unnatural confidence, as if this is where that fracture finally learned to speak.',
      'quiet-refusals':
        'Every sealed door on the ring feels like an old refusal given hardware, pressure, and time.',
    },
  },
}
