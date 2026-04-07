import type {
  SwordsCharacterArchetype,
  SwordsCharacterChoiceOption,
  SwordsCharacterCreationModeOption,
  SwordsCharacterCustomFieldDefinition,
} from '../types/character.js'

export const SWORDS_CHARACTER_CREATION_MODES: SwordsCharacterCreationModeOption[] =
  [
    {
      mode: 'premade',
      label: 'Premade',
      description: 'Start with a strong archetype, then make it yours with a true name.',
    },
    {
      mode: 'procedural',
      label: 'Procedural',
      description: 'Let the world deal you a short list of dangerous possible lives.',
    },
    {
      mode: 'custom',
      label: 'Custom',
      description: 'Choose each part yourself and build the character piece by piece.',
    },
  ]

export const SWORDS_PREMADE_ARCHETYPES: SwordsCharacterArchetype[] = [
  {
    id: 'ash-knife',
    label: 'Ash Knife',
    hook: 'A street duelist who smiles when the other hand goes for steel.',
    sheet: {
      archetype: 'Ash Knife',
      className: 'Duelist',
      species: 'Human',
      origin: 'the soot markets',
      strength: 'quick nerve',
      flaw: 'answers insult before danger',
      keepsake: 'a nicked knife with a warm grip',
      drive: 'leave one city before it claims your name',
      omen: 'smoke never quite leaves your sleeves',
    },
  },
  {
    id: 'salt-witness',
    label: 'Salt Witness',
    hook: 'A coast-born watcher who can tell when a room is about to go bad.',
    sheet: {
      archetype: 'Salt Witness',
      className: 'Witness',
      species: 'Human',
      origin: 'the drowned coast',
      strength: 'noticing what others skip',
      flaw: 'lingers too long with the uncanny',
      keepsake: 'a vial of gray sea salt',
      drive: 'find who keeps rewriting the same omen',
      omen: 'lantern glass clouds when you are afraid',
    },
  },
  {
    id: 'latch-born-pilgrim',
    label: 'Latch-Born Pilgrim',
    hook: 'A road-worn threshold walker who never trusts a closed door at first sight.',
    sheet: {
      archetype: 'Latch-Born Pilgrim',
      className: 'Pilgrim',
      species: 'Latch-Born',
      origin: 'the hinge quarter',
      strength: 'patient courage',
      flaw: 'mistakes riddles for invitations',
      keepsake: 'a bent brass latch',
      drive: 'discover which door was meant to be yours',
      omen: 'metal warms a moment before a crossing',
    },
  },
  {
    id: 'glass-quarter-duelist',
    label: 'Glass Quarter Duelist',
    hook: 'A graceful survivor from a hard district where style was one more weapon.',
    sheet: {
      archetype: 'Glass Quarter Duelist',
      className: 'Duelist',
      species: 'Glass Kin',
      origin: 'the glass quarter',
      strength: 'beautiful restraint',
      flaw: 'pride when cornered',
      keepsake: 'a cracked mirrored token',
      drive: 'prove grace can survive ugly rooms',
      omen: 'reflections hesitate around you',
    },
  },
  {
    id: 'reef-lantern-runner',
    label: 'Reef Lantern Runner',
    hook: 'A messenger from the black docks who runs faster than the stories sent after them.',
    sheet: {
      archetype: 'Reef Lantern Runner',
      className: 'Runner',
      species: 'Human',
      origin: 'the black docks',
      strength: 'speed with purpose',
      flaw: 'cannot leave mysteries unopened',
      keepsake: 'a green-lensed dock lantern',
      drive: 'deliver the one message that was never meant to arrive',
      omen: 'wet footprints appear where you have not walked',
    },
  },
  {
    id: 'thorn-court-apostate',
    label: 'Thorn Court Apostate',
    hook: 'A fallen court speaker who escaped with their voice and very little else.',
    sheet: {
      archetype: 'Thorn Court Apostate',
      className: 'Speaker',
      species: 'Fae-Touched',
      origin: 'the thorn court',
      strength: 'dangerous charm',
      flaw: 'cannot resist testing power',
      keepsake: 'a blackthorn signet turned inward',
      drive: 'learn which promises still bind you',
      omen: 'leaves collect where your shadow waits',
    },
  },
]

const CLASS_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'duelist', label: 'Duelist', description: 'Fast hands, fast nerve, fast consequences.' },
  { id: 'pilgrim', label: 'Pilgrim', description: 'You keep walking until the world explains itself.' },
  { id: 'speaker', label: 'Speaker', description: 'Your voice changes rooms before your body does.' },
  { id: 'runner', label: 'Runner', description: 'You survive by arriving before dread does.' },
  { id: 'witness', label: 'Witness', description: 'You are good at seeing what people wish stayed hidden.' },
]

const SPECIES_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'human', label: 'Human', description: 'Frail enough to matter, stubborn enough to continue.' },
  { id: 'glass-kin', label: 'Glass Kin', description: 'Beautiful under pressure, dangerous when cracked.' },
  { id: 'latch-born', label: 'Latch-Born', description: 'Thresholds feel slightly more personal around you.' },
  { id: 'fae-touched', label: 'Fae-Touched', description: 'You still carry the etiquette of somewhere stranger.' },
  { id: 'mars-born', label: 'Mars-Born', description: 'Dry air and hard silence raised you.' },
]

const ORIGIN_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'soot-markets', label: 'the soot markets', description: 'Trade, heat, and arguments taught you early.' },
  { id: 'drowned-coast', label: 'the drowned coast', description: 'Salt and loss still live in your mouth.' },
  { id: 'hinge-quarter', label: 'the hinge quarter', description: 'Every door there opened with a price.' },
  { id: 'black-docks', label: 'the black docks', description: 'Everything arrived late except danger.' },
  { id: 'thorn-court', label: 'the thorn court', description: 'Beauty and cruelty learned each other by name.' },
  { id: 'red-outpost', label: 'the red outpost', description: 'You were shaped where every breath was counted.' },
]

const STRENGTH_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'quick-nerve', label: 'quick nerve', description: 'You move before fear gets to finish speaking.' },
  { id: 'patient-courage', label: 'patient courage', description: 'You can hold a moment without collapsing it.' },
  { id: 'dangerous-charm', label: 'dangerous charm', description: 'People often answer you before they mean to.' },
  { id: 'noticing', label: 'noticing what others skip', description: 'The smallest wrong thing catches your eye.' },
  { id: 'restraint', label: 'beautiful restraint', description: 'You can leave force sheathed longer than most.' },
]

const FLAW_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'pride', label: 'pride when cornered', description: 'Pressure makes you sharper and less wise.' },
  { id: 'curiosity', label: 'cannot leave mysteries unopened', description: 'You keep touching the wrong doors.' },
  { id: 'insult', label: 'answers insult before danger', description: 'You notice disrespect too early.' },
  { id: 'lingers', label: 'lingers too long with the uncanny', description: 'You stay near oddness after others step back.' },
  { id: 'tests-power', label: 'tests power just to hear it answer', description: 'You push the line because it is there.' },
]

const KEEPSAKE_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'knife', label: 'a nicked knife', description: 'Practical, loyal, slightly hungry.' },
  { id: 'salt-vial', label: 'a vial of gray sea salt', description: 'It clumps before bad weather of any kind.' },
  { id: 'bent-latch', label: 'a bent brass latch', description: 'Warm in your hand when crossings are near.' },
  { id: 'green-lantern', label: 'a green-lensed lantern', description: 'It has shown you more than roads.' },
  { id: 'blackthorn-signet', label: 'a blackthorn signet', description: 'You wear it turned inward.' },
]

const DRIVE_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'leave-city', label: 'leave one city before it claims your name', description: 'You do not intend to be kept.' },
  { id: 'find-rewriter', label: 'find who keeps rewriting the same omen', description: 'Pattern has become personal.' },
  { id: 'discover-door', label: 'discover which door was meant to be yours', description: 'Something has been waiting.' },
  { id: 'prove-grace', label: 'prove grace can survive ugly rooms', description: 'You are tired of surrendering beauty.' },
  { id: 'deliver-message', label: 'deliver the message that was never meant to arrive', description: 'A task is following you.' },
]

const OMEN_OPTIONS: SwordsCharacterChoiceOption[] = [
  { id: 'smoke-sleeves', label: 'smoke never quite leaves your sleeves', description: 'Even after rain.' },
  { id: 'lantern-glass', label: 'lantern glass clouds when you are afraid', description: 'As if breath lives inside it.' },
  { id: 'warm-metal', label: 'metal warms a moment before a crossing', description: 'Your palm learns first.' },
  { id: 'hesitating-reflections', label: 'reflections hesitate around you', description: 'Only for a heartbeat, but enough.' },
  { id: 'wet-footprints', label: 'wet footprints appear where you have not walked', description: 'No one believes you twice.' },
]

export const SWORDS_CUSTOM_CHARACTER_FIELDS: SwordsCharacterCustomFieldDefinition[] =
  [
    { field: 'className', label: 'Class', prompt: 'Choose the kind of trouble your character is best at surviving.', options: CLASS_OPTIONS },
    { field: 'species', label: 'Species', prompt: 'Choose what kind of body and inheritance the world gave them.', options: SPECIES_OPTIONS },
    { field: 'origin', label: 'Origin', prompt: 'Choose the place that taught them their first wrong lesson.', options: ORIGIN_OPTIONS },
    { field: 'strength', label: 'Strength', prompt: 'Choose the quality that keeps them alive longer than expected.', options: STRENGTH_OPTIONS },
    { field: 'flaw', label: 'Flaw', prompt: 'Choose the weakness that keeps getting a vote.', options: FLAW_OPTIONS },
    { field: 'keepsake', label: 'Keepsake', prompt: 'Choose the thing they still carry when they should have thrown it away.', options: KEEPSAKE_OPTIONS },
    { field: 'drive', label: 'Drive', prompt: 'Choose what keeps them moving when caution would be wiser.', options: DRIVE_OPTIONS },
    { field: 'omen', label: 'Omen', prompt: 'Choose the quiet strange thing the world already does around them.', options: OMEN_OPTIONS },
  ]
