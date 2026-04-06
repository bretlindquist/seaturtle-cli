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
