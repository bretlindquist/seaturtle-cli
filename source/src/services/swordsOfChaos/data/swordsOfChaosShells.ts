import type {
  SwordsOpeningShell,
  SwordsOpeningOption,
  SwordsSecondBeat,
} from '../types/shells.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'

export const SWORDS_OF_CHAOS_OPENING_LABELS: Record<
  SwordsOfChaosOpeningChoice,
  string
> = {
  'draw-steel': 'Draw Steel',
  'bow-slightly': 'Bow Slightly',
  'talk-like-you-belong': "Talk Like You've Been Here Before",
}

export const SWORDS_OF_CHAOS_OPENING_OPTIONS: SwordsOpeningOption[] = [
  {
    label: 'Draw Steel',
    value: 'draw-steel',
    description: 'Step into the alley like you belong there',
  },
  {
    label: 'Bow Slightly',
    value: 'bow-slightly',
    description: 'Respect the moment and hope it respects you back',
  },
  {
    label: "Talk Like You've Been Here Before",
    value: 'talk-like-you-belong',
    description:
      'Bluff familiarity and let the alley decide whether to believe you',
  },
]

export const SWORDS_OF_CHAOS_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'A short BBS alleyway. A trench-coat turtle. Three different ways to make the night interesting.',
  sceneText:
    'Neon rain. A humming sign. A trench-coat turtle under one broken lamp.\n\nThe first move matters here. Pick the posture that feels most like trouble you can survive.',
  hintText: 'Choose a stance, not just an action.',
}

export const SWORDS_OF_CHAOS_RETURNING_OPENING_SHELL: SwordsOpeningShell = {
  subtitle: 'The alley seems to know you now. The broken lamp does too.',
  sceneText:
    'Neon rain again. The humming sign is where you left it, but something about the alley feels closer than memory should allow.',
  hintText: 'A familiar place rarely offers the same meaning twice.',
}

export const SWORDS_OF_CHAOS_THREADMARKED_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'The alley has rearranged itself around your absence. Something larger is starting to use it as a doorway.',
  sceneText:
    'Neon rain again, but the sign is darker now and the brickwork carries marks you do not remember leaving. Something in the alley has had time to think about you.',
  hintText:
    'The alley remembers your last answer, but the thread behind it has started remembering you too.',
}

export const SWORDS_OF_CHAOS_SEATURTLE_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'The alley has rearranged itself around your absence. A second presence lingers in the rain and refuses to stand still long enough to name.',
  sceneText:
    'Neon rain again, and the reflection under the broken lamp keeps threatening to become two shapes instead of one.',
  hintText:
    'The alley remembers your last answer, and something gentler than the alley seems to be watching what you do with the next one.',
}

export const SWORDS_OF_CHAOS_OLD_TREE_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'You open your eyes beneath a bramble-latched tree older than the alley and somehow carrying the same pressure.',
  sceneText:
    'Wet roots knot through black soil. A metal latch disappears under thorn and moss where no latch should exist. You were somewhere else a moment ago. Now the tree is waiting as if it has kept your place.',
  hintText:
    'Some places do not repeat. They relocate the question.',
}

export const SWORDS_OF_CHAOS_OCEAN_SHIP_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'You come to on a black-decked ship under hard salt wind, with no memory of boarding and every certainty that the voyage has been waiting for you.',
  sceneText:
    'The boards are wet with cold spray. Lantern light rolls over coiled rope and a hatch rimmed in green corrosion. Somewhere below deck, something knocks from the inside as if the sea itself learned how to ask for entry.',
  hintText:
    'Some callbacks do not bring you back. They carry you onward.',
}

export const SWORDS_OF_CHAOS_SPACE_STATION_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'You wake under failing strip-lights on a station ring that hums like a broken theorem trying to finish itself.',
  sceneText:
    'Frost clings to the inside of the bulkhead. One corridor is sealed by a sparking pressure door and another opens onto a dark observation blister where stars hang too still to trust. Somewhere in the metal, a fractured announcement repeats the wrong name for this place.',
  hintText:
    'Some places do not remember you as a person first. They remember you as a variable.',
}

export const SWORDS_OF_CHAOS_FAE_REALM_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'You open your eyes in a grove lit by patient foxfire, where every leaf seems to be listening for a promise you do not remember making.',
  sceneText:
    'Silver roots break through black water. Lantern-moths drift between pale trunks, and somewhere just beyond sight a courtly laugh decides whether you arrived as guest, trespasser, or entertainment. The same pressure from the alley is here, only dressed in beauty that knows it is armed.',
  hintText:
    'Some places test you with danger. Others test whether you can recognize danger wearing grace.',
}

export const SWORDS_OF_CHAOS_DARK_DUNGEON_OPENING_SHELL: SwordsOpeningShell = {
  subtitle:
    'You wake in a cavernous dungeon where the dark is full of coaxing voices and every archway seems to remember a refusal you made elsewhere.',
  sceneText:
    'Cold stone sweats under green-black torchlight. Iron rings hang from the walls with no visible chain, and a stair descends into a lower dark that keeps trying to sound welcoming. Whatever thread followed you here has learned how to whisper.',
  hintText:
    'Some places threaten openly. Others ask so sweetly that saying no becomes the real trial.',
}

export const SWORDS_OF_CHAOS_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'The trench-coat turtle shifts one step sideways. The broken sign hums louder.',
    intro:
      'You have announced yourself with steel. Now the alley wants to know whether you came for theater, balance, or trouble.',
    options: [
      {
        label: 'Cut the sign chain',
        value: 'cut-the-sign-chain',
        description: 'Strike the alley itself and see what falls free',
      },
      {
        label: 'Hold the line',
        value: 'hold-the-line',
        description: 'Stay still enough to make the moment blink first',
      },
      {
        label: 'Lower the blade',
        value: 'lower-the-blade',
        description: 'Refuse the easy script without backing down',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'The turtle returns the gesture by half a breath. The rain keeps score.',
    intro:
      'Respect bought you a second moment. The alley now wants to see whether your calm is discipline, courage, or curiosity.',
    options: [
      {
        label: 'Keep bowing',
        value: 'keep-bowing',
        description: 'Stay with the gesture until it means something new',
      },
      {
        label: 'Meet the gaze',
        value: 'meet-the-gaze',
        description: 'Raise your head and answer without aggression',
      },
      {
        label: 'Ask the price',
        value: 'ask-the-price',
        description: 'Treat the alley like a bargain and see what it asks back',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'The trench-coat turtle lets the silence run just long enough to become dangerous.',
    intro:
      'You walked in as if this place already knew you. Now you have to prove whether that was charm, nerve, or a spectacular mistake.',
    options: [
      {
        label: 'Name a false title',
        value: 'name-a-false-title',
        description: 'Push the bluff into outright mythmaking',
      },
      {
        label: 'Laugh like you mean it',
        value: 'laugh-like-you-mean-it',
        description: 'Treat the alley like an old joke that finally landed',
      },
      {
        label: 'Double down',
        value: 'double-down',
        description: 'Keep the bit alive until reality has to pick a side',
      },
    ],
  },
}

export const SWORDS_OF_CHAOS_RETURNING_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'The sign chain is already swaying when your hand reaches the hilt. Something in the alley moved first this time.',
    intro:
      'Steel is not an announcement anymore. Here, it is a remembered argument. The alley wants to know whether you came back to finish it, redirect it, or finally refuse it.',
    options: [
      {
        label: 'Break the lamp shadow',
        value: 'cut-the-sign-chain',
        description:
          'Strike where the light fails instead of where the chain hangs. Something else might answer.',
      },
      {
        label: 'Stand where you stood before',
        value: 'hold-the-line',
        description:
          'Take the remembered ground on purpose and dare the alley to repeat itself exactly.',
      },
      {
        label: 'Sheathe the old argument',
        value: 'lower-the-blade',
        description:
          'Lower the steel like a man ending a quarrel that outlived its use.',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'This time the rain breaks around the gesture instead of through it. Even the alley seems careful with the moment.',
    intro:
      'Respect has history here now. The place is no longer testing whether you are calm. It is testing whether your calm can change what happens next.',
    options: [
      {
        label: 'Hold the old courtesy',
        value: 'keep-bowing',
        description:
          'Stay in the gesture until the alley has to decide whether it is ritual or surrender.',
      },
      {
        label: 'Lift your chin slowly',
        value: 'meet-the-gaze',
        description:
          'Answer the remembered moment with a steadier version of yourself.',
      },
      {
        label: 'Ask what changed',
        value: 'ask-the-price',
        description:
          'Treat the alley like a bargain that has had time to reconsider its terms.',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'The silence does not turn dangerous this time. It turns amused, which is somehow worse.',
    intro:
      'The bluff survived long enough to become part of the place. Now the alley wants to know whether you came back to deepen the lie, inherit it, or finally speak plain.',
    options: [
      {
        label: 'Use the old name again',
        value: 'name-a-false-title',
        description:
          'Say the myth once more and see whether repetition makes it truer or thinner.',
      },
      {
        label: 'Laugh like you know the punchline',
        value: 'laugh-like-you-mean-it',
        description:
          'Treat the whole remembered tension like a private joke the alley almost understands.',
      },
      {
        label: 'Tell the truth crookedly',
        value: 'double-down',
        description:
          'Push forward, but bend the bluff just enough that it starts sounding like confession.',
      },
    ],
  },
}

export const SWORDS_OF_CHAOS_THREADMARKED_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'The lamp throws a second shadow that does not belong to either of you. The alley acts as if it has already chosen a side.',
    intro:
      'Steel is no longer the question. Something behind the alley has started taking an interest in how violence names a place. The moment feels less private than it used to.',
    options: [
      {
        label: 'Cut where the shadow thickens',
        value: 'cut-the-sign-chain',
        description:
          'Strike the place where the false dark gathers and see whether the alley bleeds symbol or wire.',
      },
      {
        label: 'Refuse the offered script',
        value: 'hold-the-line',
        description:
          'Stay exactly where you are and make the larger thing reveal how badly it needs your participation.',
      },
      {
        label: 'Turn the blade aside',
        value: 'lower-the-blade',
        description:
          'Deny the scene the ending it wants and see what kind of pressure remains without violence.',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'The rain holds its breath around you. Even the alley seems to understand that something else has entered the negotiation.',
    intro:
      'Courtesy has become a live wire. The place now reads your calm as either an opening, a ward, or a refusal to let the thread name the terms.',
    options: [
      {
        label: 'Keep the warding posture',
        value: 'keep-bowing',
        description:
          'Let the gesture harden into something the alley cannot easily turn into obedience.',
      },
      {
        label: 'Answer the hidden witness',
        value: 'meet-the-gaze',
        description:
          'Lift your chin as if the real conversation is happening one layer behind the visible one.',
      },
      {
        label: 'Ask who profits',
        value: 'ask-the-price',
        description:
          'Treat the whole moment like a bargain someone larger is trying to close around you.',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'The alley does not laugh. Something beyond it almost does.',
    intro:
      'The bluff has crossed a threshold. What used to feel like nerve now feels like you may have accidentally addressed a room larger than the one you can see.',
    options: [
      {
        label: 'Give the myth a sharper name',
        value: 'name-a-false-title',
        description:
          'Say the lie as if it has already become institutional truth somewhere nearby.',
      },
      {
        label: 'Smile at the unseen audience',
        value: 'laugh-like-you-mean-it',
        description:
          'Play to the thing behind the alley and see whether it prefers confidence or sacrilege.',
      },
      {
        label: 'Confess without kneeling',
        value: 'double-down',
        description:
          'Keep talking, but bend the bluff until it sounds like a dangerous half-truth.',
      },
    ],
  },
}

export const SWORDS_OF_CHAOS_OLD_TREE_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'The bark parts just enough to reveal metal under wood grain. The tree is not natural enough to trust.',
    intro:
      'Steel feels smaller here, but no less honest. The old tree wants to know whether you mean to pry, defend, or refuse the mechanism hidden in its heart.',
    options: [
      {
        label: 'Cut the bramble latch',
        value: 'cut-the-sign-chain',
        description:
          'Strike the buried mechanism and see whether the tree opens like a door or bleeds like a lie.',
      },
      {
        label: 'Stand under the roots',
        value: 'hold-the-line',
        description:
          'Hold your ground beneath the hanging roots and make the place reveal what it expected you to do.',
      },
      {
        label: 'Lower the sword to the bark',
        value: 'lower-the-blade',
        description:
          'Offer restraint to something that looks built to punish force.',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'Leaves shiver without wind. The old tree answers courtesy by tightening the silence around it.',
    intro:
      'Respect reaches differently here. The tree does not care for manners, only for whether you can approach a buried threshold without waking the wrong thing inside it.',
    options: [
      {
        label: 'Keep the old stillness',
        value: 'keep-bowing',
        description:
          'Stay inside the gesture until the roots decide whether you are guest, pilgrim, or intruder.',
      },
      {
        label: 'Raise your eyes to the knot',
        value: 'meet-the-gaze',
        description:
          'Meet the dark center of the trunk as if it were looking back through rings older than speech.',
      },
      {
        label: 'Ask who sealed it',
        value: 'ask-the-price',
        description:
          'Treat the buried latch like evidence that someone once feared what the tree keeps.',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'Somewhere inside the roots, something almost clicks in amusement.',
    intro:
      'The bluff sounds different under branches that remember older kingdoms. Here it is not charm alone. It is trespass dressed as confidence.',
    options: [
      {
        label: 'Name the vanished order',
        value: 'name-a-false-title',
        description:
          'Speak as if you know which dead house built the latch into the trunk.',
      },
      {
        label: 'Laugh under the branches',
        value: 'laugh-like-you-mean-it',
        description:
          'Answer the haunted stillness like you have heard its joke before.',
      },
      {
        label: 'Keep talking through the roots',
        value: 'double-down',
        description:
          'Push the bluff until the tree has to decide whether to expose you or accept you.',
      },
    ],
  },
}

export const SWORDS_OF_CHAOS_OCEAN_SHIP_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'The lantern swings. Below deck, the knocking answers your grip on the blade.',
    intro:
      'Steel on a ship means two things: mutiny or defense. The sea does not care which one you think you chose. Something below wants the distinction badly.',
    options: [
      {
        label: 'Cut the hatch rope',
        value: 'cut-the-sign-chain',
        description:
          'Sever the line holding the hatch fast and let the dark below declare itself first.',
      },
      {
        label: 'Brace at the rail',
        value: 'hold-the-line',
        description:
          'Hold the deck and force whatever is coming to meet you in open salt air.',
      },
      {
        label: 'Lower the point',
        value: 'lower-the-blade',
        description:
          'Keep the blade ready, but deny the ship the violence it seems eager to stage.',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'The mast groans like an old witness. Even the wind seems to pause to see what courtesy means out here.',
    intro:
      'Respect on the open water can read as seamanship, fear, or prayer. The deck beneath you wants to know which one you meant.',
    options: [
      {
        label: 'Keep the still posture',
        value: 'keep-bowing',
        description:
          'Hold the line of your body against the roll and let the ship decide whether that is reverence or defiance.',
      },
      {
        label: 'Look toward the wheel',
        value: 'meet-the-gaze',
        description:
          'Raise your head as if the real captain is not the one with hands on the helm.',
      },
      {
        label: 'Ask what cargo this is',
        value: 'ask-the-price',
        description:
          'Treat the whole deck like a bargain already made by someone who did not ask you first.',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'The ship answers with a low timber laugh. No one on deck admits to making the sound.',
    intro:
      'Bluffing familiarity works differently at sea. Here the danger is not that they know you are lying. It is that the ship may decide you are telling the truth.',
    options: [
      {
        label: 'Name the vessel as if it is yours',
        value: 'name-a-false-title',
        description:
          'Speak ownership into the salt air and see whether the deck accepts rank before truth.',
      },
      {
        label: 'Laugh into the wind',
        value: 'laugh-like-you-mean-it',
        description:
          'Throw confidence overboard and see whether it floats back as authority.',
      },
      {
        label: 'Keep talking past the crew',
        value: 'double-down',
        description:
          'Push the bluff until the ship itself has to decide whether to call you captain or prey.',
      },
    ],
  },
}

export const SWORDS_OF_CHAOS_SPACE_STATION_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'Emergency lights stutter red across the corridor. Something behind the pressure door answers the blade with a metallic click.',
    intro:
      'Steel aboard a station feels absurd right up until the hull starts sounding like a throat clearing. Here, force is either a key, a mistake, or the only honest language left.',
    options: [
      {
        label: 'Cut the sparking seal',
        value: 'cut-the-sign-chain',
        description:
          'Break the failing lock and let the sealed corridor decide whether it was containing danger or hiding it.',
      },
      {
        label: 'Hold at the bulkhead',
        value: 'hold-the-line',
        description:
          'Brace in the corridor and make whatever is cycling the lights show itself first.',
      },
      {
        label: 'Lower the blade to the console',
        value: 'lower-the-blade',
        description:
          'Refuse the station a bloodier answer and see whether it prefers signal to violence.',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'The station answers the gesture with a soft chime from no visible speaker.',
    intro:
      'Courtesy on a station feels like protocol in a place that has forgotten its operators. The question now is whether the machine reads you as guest, override, or trespasser.',
    options: [
      {
        label: 'Keep the formal stillness',
        value: 'keep-bowing',
        description:
          'Let the posture become a protocol the room might recognize before you understand it.',
      },
      {
        label: 'Meet the black glass',
        value: 'meet-the-gaze',
        description:
          'Raise your head toward the observation blister as if the real witness is somewhere beyond the stars.',
      },
      {
        label: 'Ask what system is failing',
        value: 'ask-the-price',
        description:
          'Treat the station like a negotiation already in progress between malfunction and intent.',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'An old speaker crackles to life, then thinks better of it. The silence afterward feels supervised.',
    intro:
      'Bluffing on a station means claiming familiarity with a system that may once have had laws. The risk is no longer embarrassment. It is authentication.',
    options: [
      {
        label: 'State the clearance anyway',
        value: 'name-a-false-title',
        description:
          'Give the station a rank and see whether broken machines still honor hierarchy.',
      },
      {
        label: 'Laugh at the warning tone',
        value: 'laugh-like-you-mean-it',
        description:
          'Answer the glitch like you know which part of it is theater.',
      },
      {
        label: 'Keep talking through the static',
        value: 'double-down',
        description:
          'Push the bluff until the station has to decide whether you are operator, ghost, or error condition.',
      },
    ],
  },
}

export const SWORDS_OF_CHAOS_FAE_REALM_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'The foxfire leans away from the blade, but the grove itself seems delighted that you answered beauty with steel.',
    intro:
      'Force in a fae place is never only force. It is insult, invitation, or proof that you still believe edges can tell truth from glamour.',
    options: [
      {
        label: 'Cut the lantern vine',
        value: 'cut-the-sign-chain',
        description:
          'Sever the glowing vine above you and see whether the light falls, screams, or changes its mind.',
      },
      {
        label: 'Stand in the black water',
        value: 'hold-the-line',
        description:
          'Hold your ground in the mirrored pool and make the grove reveal which version of you it wants to keep.',
      },
      {
        label: 'Lower the sword to the moss',
        value: 'lower-the-blade',
        description:
          'Refuse to let the realm choreograph you into violence and see what kind of courtesy it respects instead.',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'The grove answers with a curtsy of branches. Somewhere unseen, something older than manners approves of your nerve.',
    intro:
      'Courtesy in the fae dark is dangerous because it can mean reverence, challenge, or a willingness to play by rules no one explained aloud.',
    options: [
      {
        label: 'Hold the courtly line',
        value: 'keep-bowing',
        description:
          'Remain in the gesture until the grove has to decide whether you are offering respect or demanding recognition.',
      },
      {
        label: 'Raise your eyes to the foxfire',
        value: 'meet-the-gaze',
        description:
          'Meet the nearest light as if it were the visible edge of the real witness.',
      },
      {
        label: 'Ask which promise brought you here',
        value: 'ask-the-price',
        description:
          'Treat the whole grove like the aftermath of a bargain you do not remember consenting to.',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'The laugh comes again, closer now. In the grove, confidence sounds dangerously similar to remembered rank.',
    intro:
      'Bluffing familiarity in a fae place risks more than embarrassment. It risks the realm deciding you really do belong to one of its older stories.',
    options: [
      {
        label: 'Name the hidden court',
        value: 'name-a-false-title',
        description:
          'Speak as if you know exactly which house claims the lanterns, the roots, and the right to judge you.',
      },
      {
        label: 'Laugh with the unseen host',
        value: 'laugh-like-you-mean-it',
        description:
          'Answer the distant amusement like you and the grove have already survived one another before.',
      },
      {
        label: 'Keep talking through the glamour',
        value: 'double-down',
        description:
          'Push the bluff until the realm must either expose you or seat you at a table you never meant to find.',
      },
    ],
  },
}

export const SWORDS_OF_CHAOS_DARK_DUNGEON_SECOND_BEATS: Record<
  SwordsOfChaosOpeningChoice,
  SwordsSecondBeat
> = {
  'draw-steel': {
    subtitle:
      'The dungeon takes the blade as an answer and lets the whispers turn admiring for all the wrong reasons.',
    intro:
      'Violence down here feels less like action and more like consent. The cavern wants to know whether your steel is a ward, a surrender, or the first note in a song it already knows.',
    options: [
      {
        label: 'Strike the whispering chain',
        value: 'cut-the-sign-chain',
        description:
          'Cut at the iron ring and listen for whether stone, voice, or memory screams first.',
      },
      {
        label: 'Stand above the stair',
        value: 'hold-the-line',
        description:
          'Hold the threshold and force the lower dark to come to you without the dignity of invitation.',
      },
      {
        label: 'Lower the blade into shadow',
        value: 'lower-the-blade',
        description:
          'Refuse to let the dungeon decide that every fear should end in steel.',
      },
    ],
  },
  'bow-slightly': {
    subtitle:
      'The seductive voices soften, which is somehow more dangerous than when they were hungry.',
    intro:
      'Courtesy in a dungeon of whispers can be reverence, mockery, or an attempt to avoid being mistaken for prey. The echoing dark wants to know which one you intended.',
    options: [
      {
        label: 'Keep the careful posture',
        value: 'keep-bowing',
        description:
          'Hold the line of restraint until the whispers decide whether they are being honored or denied.',
      },
      {
        label: 'Lift your eyes into the vault',
        value: 'meet-the-gaze',
        description:
          'Answer the unseen speakers as if they were only the visible edge of something deeper below.',
      },
      {
        label: 'Ask who keeps calling',
        value: 'ask-the-price',
        description:
          'Treat the voices like a bargain trying to pretend it is company.',
      },
    ],
  },
  'talk-like-you-belong': {
    subtitle:
      'The dungeon almost purrs. Confidence sounds dangerously compatible with this place.',
    intro:
      'Bluffing familiarity in a chamber like this risks becoming exactly what the whispers hoped you would be: someone who mistakes recognition for safety.',
    options: [
      {
        label: 'Name the buried order',
        value: 'name-a-false-title',
        description:
          'Claim to know who carved the archways and see whether the stone still respects rank.',
      },
      {
        label: 'Laugh into the hollow',
        value: 'laugh-like-you-mean-it',
        description:
          'Answer the coaxing dark as if you already know which part of it is theater.',
      },
      {
        label: 'Keep talking down the stair',
        value: 'double-down',
        description:
          'Push the bluff until the dungeon must either expose you or welcome you farther than wisdom would advise.',
      },
    ],
  },
}
