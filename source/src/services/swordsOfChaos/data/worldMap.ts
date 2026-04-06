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
    recurringSymbol:
      'A broken lamp, a shell-green seam, and one wrong name keep reappearing as if the whole world were revising the same scene in different matter.',
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
    recurringSymbol:
      'The bramble latch hides the same shell-green seam and wrong-name pressure that once lived under neon.',
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
    recurringSymbol:
      'The lantern swing, green corrosion, and the ship’s half-true name all feel like shipborne versions of the same old sign and lamp.',
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
  'post-apocalyptic-ruin': {
    connectiveWeight:
      'The ruin feels like the ship after land remembered it badly: the same shell-green trail and broken warnings, only now they sit under ash, collapse, and the long patience of failed survival.',
    recurringSymbol:
      'A cracked siren tower, shell-green corrosion in the rubble, and a district name spoken wrong by dead speakers make the ruin feel like the relic trail after the world gave up pretending it was local.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Shell-green corrosion has climbed the ruin like ivy made of circuitry, as if the relic path finally found the graveyard it was always walking toward.',
      'broken-lamp-witnesses':
        'A watchlight still blinks in the ruin in the same rhythm as the lamp and the beacon, stubborn enough to make witness feel like a curse.',
      'alley-oath-keepers':
        'The broken walls feel full of promises people made to outlast collapse and then failed to keep together.',
      'sign-truth-fractures':
        'Every district marker here says the wrong name with total confidence, as if truth has been cracked long enough to fossilize.',
      'quiet-refusals':
        'The sealed bunkers and half-open doors suggest a history of refusals mistaken for strategy until the city learned to bury them.',
    },
  },
  'space-station': {
    connectiveWeight:
      'The station does not replace the alley. It feels like the same structure expressed as pressure doors, frost, and failing light.',
    recurringSymbol:
      'A failing strip-light, a shell-green fault in the conduit, and a wrong announcement suggest the alley survived translation into orbit.',
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
  'mars-outpost': {
    connectiveWeight:
      'The outpost feels like the station after history and weather got hold of it: the same fracture translated into dust, heat-scarred metal, and old emergency myths.',
    recurringSymbol:
      'A shell-green glint in the dust, a cracked beacon, and a designation spoken wrong over dead speakers make Mars feel like the same wound wearing red silence.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Shell-green dust gathers in the outpost seams like a relic trail that finally learned how to survive without water.',
      'broken-lamp-witnesses':
        'The beacon stutters with the same watchful patience as the broken lamp, only now the witness lives in dry static and horizon glare.',
      'alley-oath-keepers':
        'The outpost feels full of promises made to survive one more night and then left to fossilize in red dust.',
      'sign-truth-fractures':
        'Every designation here sounds one syllable wrong, as if the old station fracture came down to Mars and learned how to haunt a colony instead of a corridor.',
      'quiet-refusals':
        'Sealed hatches and abandoned pressure tents suggest a chain of refusals that kept being mistaken for strategy until the desert learned their real names.',
    },
  },
  'fae-realm': {
    connectiveWeight:
      'The fae grove does not break the map. It feels like the same world slipping into glamour, witness, and older bargains.',
    recurringSymbol:
      'The foxfire carries the same witness-light, shell-green sheen, and naming trouble that once lived in brick and metal.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Shell-green glints in dew and enamel alike, as if the relic trail can teach even petals how to corrode.',
      'broken-lamp-witnesses':
        'The watching light has become foxfire and moth-lantern, but it is still the same witness changing masks.',
      'alley-oath-keepers':
        'Promises here bind like old courtesy: beautiful until you realize beauty is just another enforcement layer.',
      'sign-truth-fractures':
        'Names slip a little sideways here too, as if glamour and broken signage learned the same trick from different tutors.',
      'quiet-refusals':
        'Every path not taken in the grove still glows faintly, unwilling to admit it has been abandoned.',
    },
  },
  'dark-dungeon': {
    connectiveWeight:
      'The dungeon feels like the underside of every other place: the same questions sunk deeper until they learned to speak in echoes and temptation.',
    recurringSymbol:
      'Torch phosphor, shell-green mineral seams, and names repeated wrong in the dark make the dungeon feel like every other place turned inside out.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Shell-green glints in the mineral seams like a relic trail buried alive and still trying to surface.',
      'broken-lamp-witnesses':
        'The watchlight has become low phosphor and whispering sconces, but it still behaves like the same old witness.',
      'alley-oath-keepers':
        'Down here, promises sound less noble and more binding, as if every vow eventually needs a cellar.',
      'sign-truth-fractures':
        'The dungeon repeats names back wrong on purpose, turning cracked truth into a seduction rather than a glitch.',
      'quiet-refusals':
        'The seductive voices know exactly which doors you closed elsewhere and they keep trying the handles from the other side.',
    },
  },
}
