import type {
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
