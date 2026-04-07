import type {
  SwordsOfChaosEncounterLocus,
  SwordsOfChaosThreadPresentation,
  SwordsOfChaosWorldMapNode,
} from '../types/worldMap.js'

export const SWORDS_OF_CHAOS_THREAD_PRESENTATION: Record<
  string,
  SwordsOfChaosThreadPresentation
> = {
  'half-shell-relic-trail': {
    title: 'the relic trail',
    pressure: 'The relic trail no longer feels accidental. Something has been carrying it from place to place.',
  },
  'broken-lamp-witnesses': {
    title: 'the witness light',
    pressure: 'The witness light keeps turning up where it should not, as if one watcher keeps finding new windows.',
  },
  'alley-oath-keepers': {
    title: 'the oathkeepers',
    pressure: 'The oathkeepers have stopped sounding like rumor. Something keeps building around their promises.',
  },
  'sign-truth-fractures': {
    title: 'the fractured sign',
    pressure: 'The fractured sign keeps returning as if bad naming were trying to become law.',
  },
  'quiet-refusals': {
    title: 'the refused doors',
    pressure: 'The refused doors keep following you. Some choices do not stay behind once made.',
  },
}

export const SWORDS_OF_CHAOS_WORLD_MAP: Record<
  SwordsOfChaosEncounterLocus,
  SwordsOfChaosWorldMapNode
> = {
  alley: {
    connectiveWeight:
      'The broken lamp catches a shell-green glint, then loses it.',
    recurringSymbol:
      'The sign hums, the lamp stutters, and for a moment the alley almost says the wrong name for itself.',
    threadEchoes: {
      'half-shell-relic-trail':
        'A shell-green sheen keeps finding the lamp chain and the wet brick.',
      'broken-lamp-witnesses':
        'The broken lamp watches too patiently to feel local.',
      'alley-oath-keepers':
        'The brickwork feels heavy with promises nobody fully kept.',
      'sign-truth-fractures':
        'The sign crackles like it is trying to say the wrong name on purpose.',
      'quiet-refusals':
        'Old refusals seem to linger here longer than footsteps should.',
    },
  },
  'old-tree': {
    connectiveWeight:
      'Something metal hides under the moss where no metal should be.',
    recurringSymbol:
      'The latch under the bramble shows a shell-green seam where clean brass should be.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Something shell-green lives in the latch under the bramble.',
      'broken-lamp-witnesses':
        'Light keeps catching the latch like a signal trying to stay seen.',
      'alley-oath-keepers':
        'The roots feel full of words people meant to keep.',
      'sign-truth-fractures':
        'The tree almost answers to one name and then another.',
      'quiet-refusals':
        'The unopened latch looks like a refusal grown old and dangerous.',
    },
  },
  'ocean-ship': {
    connectiveWeight:
      'Lantern light swings over wet boards and catches green corrosion at the hatch.',
    recurringSymbol:
      'The ship carries a wrong name in its timbers and green corrosion at the seams.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Green corrosion blooms along the hatch seam.',
      'broken-lamp-witnesses':
        'The lantern watches with the same patience as the broken lamp, only it sways.',
      'alley-oath-keepers':
        'The deck feels full of promises that crossed water badly.',
      'sign-truth-fractures':
        'The hull sounds wrong when someone speaks the ship’s name aloud.',
      'quiet-refusals':
        'The knocking below deck sounds like something still refusing to stay shut out.',
    },
  },
  'post-apocalyptic-ruin': {
    connectiveWeight:
      'A cracked siren tower leans over the street and keeps threatening to wake.',
    recurringSymbol:
      'A district speaker says the wrong name through ash and shell-green corrosion.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Shell-green corrosion has climbed the ruin like bad ivy.',
      'broken-lamp-witnesses':
        'One watchlight still blinks in the ruin and refuses to die quietly.',
      'alley-oath-keepers':
        'The broken walls feel full of promises made too late.',
      'sign-truth-fractures':
        'Every district marker says the wrong name with perfect confidence.',
      'quiet-refusals':
        'Sealed bunkers and half-open doors make refusal feel like local architecture.',
    },
  },
  'space-station': {
    connectiveWeight:
      'The corridor hums under failing strip-lights and a pressure door sparks at the edge of sight.',
    recurringSymbol:
      'A strip-light flickers, a conduit shows shell-green damage, and an old speaker says the wrong thing.',
    threadEchoes: {
      'half-shell-relic-trail':
        'A shell-green shimmer sits inside the frost and cable housings.',
      'broken-lamp-witnesses':
        'The strip-lights fail in a rhythm that feels almost watchful.',
      'alley-oath-keepers':
        'The station holds promises like sealed air: invisible until something ruptures.',
      'sign-truth-fractures':
        'The wrong announcement keeps coming back as if the station trusts it.',
      'quiet-refusals':
        'Every sealed door on the ring feels like an answer that has held too long.',
    },
  },
  'mars-outpost': {
    connectiveWeight:
      'A cracked beacon works at its warning while red dust rasps across the tents.',
    recurringSymbol:
      'The speakers get the designation wrong, and shell-green grit has worked into every seam.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Shell-green dust gathers in every seam that should have stayed tight.',
      'broken-lamp-witnesses':
        'The beacon stutters with the patience of something still on watch.',
      'alley-oath-keepers':
        'The outpost feels full of promises made one night at a time.',
      'sign-truth-fractures':
        'Every designation here sounds one syllable wrong.',
      'quiet-refusals':
        'Sealed hatches and abandoned tents make refusal feel like a survival tactic grown stale.',
    },
  },
  'fae-realm': {
    connectiveWeight:
      'Foxfire hangs low over black water, and the grove seems to be listening.',
    recurringSymbol:
      'Foxfire, moth-lanterns, and a half-missed name make the grove feel politely dangerous.',
    threadEchoes: {
      'half-shell-relic-trail':
        'A shell-green glint keeps turning up in dew and enamel alike.',
      'broken-lamp-witnesses':
        'The foxfire watches the way a patient witness watches a lie form.',
      'alley-oath-keepers':
        'Promises here bind like courtesy sharpened to a law.',
      'sign-truth-fractures':
        'Names slip sideways here if spoken too confidently.',
      'quiet-refusals':
        'Unchosen paths keep glowing as if they resent being left behind.',
    },
  },
  'dark-dungeon': {
    connectiveWeight:
      'The dungeon breathes through its torchlight and waits for someone to answer back.',
    recurringSymbol:
      'Torch phosphor, shell-green seams, and names repeated wrong in the dark make the place hard to trust.',
    threadEchoes: {
      'half-shell-relic-trail':
        'Shell-green glints in the mineral seams like something trying to surface.',
      'broken-lamp-witnesses':
        'The low phosphor behaves less like light and more like watchfulness.',
      'alley-oath-keepers':
        'Down here, promises sound less noble and more binding.',
      'sign-truth-fractures':
        'The dungeon repeats names back wrong on purpose.',
      'quiet-refusals':
        'The voices sound like they remember which doors you closed elsewhere.',
    },
  },
}
