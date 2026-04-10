import { getSwordsEncounterLocus, getSwordsEncounterPlaceName } from './worldMap.js'
import {
  getSwordsCharacterReactionLine,
  getSwordsCharacterTemptationLine,
} from './characterPlanner.js'
import { getSwordsMagicLine } from './magicPlanner.js'
import {
  getSwordsCarryForwardPressure,
  getSwordsContinuationLead,
  getSwordsSceneStateLead,
} from './storyPlanner.js'
import type { SwordsOfChaosSceneStage } from '../types/dm.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosOpeningChoice, SwordsOfChaosSecondChoice } from '../types/outcomes.js'
import type {
  SwordsDmAction,
  SwordsDmAdjudication,
  SwordsDramaticBeatLine,
  SwordsDramaticBeatSegment,
  SwordsDramaticBeatScript,
  SwordsFreeResponseIntent,
  SwordsFreeResponseTarget,
  SwordsFreeResponseTactic,
  SwordsFreeResponseTone,
  SwordsFreeResponseTruthfulness,
} from '../types/liveDm.js'

function detectTactic(lower: string): SwordsFreeResponseTactic {
  if (/(draw|blade|sword|steel|strike|cut|slash|fight|attack)/.test(lower)) {
    return 'steel'
  }
  if (/(bow|nod|kneel|respect|courtesy|calm|still|patient)/.test(lower)) {
    return 'courtesy'
  }
  if (/(talk|say|speak|name|claim|pretend|bluff|laugh|joke|smile|banter)/.test(lower)) {
    return 'bluff'
  }
  if (/(ask|question|price|who|what|why)/.test(lower)) {
    return 'question'
  }
  if (/(watch|look|observe|listen|study|wait)/.test(lower)) {
    return 'observe'
  }
  if (/(follow|trail|go after|shadow)/.test(lower)) {
    return 'follow'
  }
  return 'resist'
}

function detectTone(lower: string): SwordsFreeResponseTone {
  if (/(careful|slow|quiet|gently|softly|calmly|patient)/.test(lower)) {
    return 'careful'
  }
  if (/(laugh|grin|joke|smirk|tease)/.test(lower)) {
    return 'playful'
  }
  if (/(draw|charge|cut|demand|claim|order)/.test(lower)) {
    return 'bold'
  }
  if (/(ask|tell|say|speak|meet)/.test(lower)) {
    return 'direct'
  }
  return 'uncertain'
}

function detectTarget(lower: string): SwordsFreeResponseTarget {
  if (/(lamp|sign|chain|latch|door|hatch|beacon|tower|roots|bark|blade)/.test(lower)) {
    return 'object'
  }
  if (/(turtle|crew|captain|witness|speaker|light|foxfire|voice)/.test(lower)) {
    return 'witness'
  }
  if (/(alley|grove|tree|ship|station|outpost|ruin|dungeon|place|room)/.test(lower)) {
    return 'place'
  }
  if (/(myself|self|breath|stance|ground)/.test(lower)) {
    return 'self'
  }
  if (/(you|them|someone|whoever)/.test(lower)) {
    return 'opponent'
  }
  return 'unknown'
}

function detectTruthfulness(lower: string): SwordsFreeResponseTruthfulness {
  if (/(bluff|pretend|claim|lie|title|name)/.test(lower)) {
    return 'bluff'
  }
  if (/(honest|truth|plain|direct|real)/.test(lower)) {
    return 'truth'
  }
  return 'mixed'
}

function detectRisk(lower: string): 'low' | 'medium' | 'high' {
  if (/(charge|cut|attack|demand|claim|captain|captain|captaincy|captainship|captain's)/.test(lower)) {
    return 'high'
  }
  if (/(wait|watch|listen|linger|bow|respect|careful)/.test(lower)) {
    return 'low'
  }
  return 'medium'
}

function mapOpeningChoice(
  tactic: SwordsFreeResponseTactic,
): SwordsOfChaosOpeningChoice {
  switch (tactic) {
    case 'steel':
      return 'draw-steel'
    case 'courtesy':
      return 'bow-slightly'
    case 'bluff':
    case 'question':
    case 'observe':
    case 'follow':
    case 'resist':
    default:
      return 'talk-like-you-belong'
  }
}

function mapSecondChoice(
  openingChoice: SwordsOfChaosOpeningChoice,
  intent: SwordsFreeResponseIntent,
): SwordsOfChaosSecondChoice {
  if (openingChoice === 'draw-steel') {
    if (intent.target === 'object') {
      return 'cut-the-sign-chain'
    }
    if (intent.tone === 'careful' || intent.tactic === 'observe') {
      return 'hold-the-line'
    }
    return 'lower-the-blade'
  }

  if (openingChoice === 'bow-slightly') {
    if (intent.tactic === 'question') {
      return 'ask-the-price'
    }
    if (intent.target === 'witness' || intent.target === 'opponent') {
      return 'meet-the-gaze'
    }
    return 'keep-bowing'
  }

  if (intent.truthfulness === 'bluff') {
    return 'name-a-false-title'
  }
  if (intent.tone === 'playful') {
    return 'laugh-like-you-mean-it'
  }
  return 'double-down'
}

export function classifySwordsFreeResponse(input: {
  stage: SwordsOfChaosSceneStage
  text: string
  openingChoice?: SwordsOfChaosOpeningChoice | null
}): SwordsFreeResponseIntent {
  const lower = input.text.trim().toLowerCase()
  const tactic = detectTactic(lower)
  const tone = detectTone(lower)
  const target = detectTarget(lower)
  const truthfulness = detectTruthfulness(lower)
  const risk = detectRisk(lower)

  const mappedOpeningChoice =
    input.stage === 'opening' ? mapOpeningChoice(tactic) : undefined
  const mappedSecondChoice =
    input.stage === 'second-beat' && input.openingChoice
      ? mapSecondChoice(input.openingChoice, {
          stage: input.stage,
          rawText: input.text,
          tactic,
          tone,
          target,
          risk,
          truthfulness,
          confidence: 0,
        })
      : undefined

  let confidence = 0.55
  if (tactic !== 'resist') {
    confidence += 0.15
  }
  if (target !== 'unknown') {
    confidence += 0.1
  }
  if (truthfulness !== 'mixed') {
    confidence += 0.05
  }
  if (input.text.trim().length > 14) {
    confidence += 0.05
  }

  return {
    stage: input.stage,
    rawText: input.text,
    tactic,
    tone,
    target,
    risk,
    truthfulness,
    confidence: Math.min(confidence, 0.95),
    mappedOpeningChoice,
    mappedSecondChoice,
  }
}

function buildOpeningActions(
  intent: SwordsFreeResponseIntent,
): SwordsDmAction[] {
  const actions: SwordsDmAction[] = []

  if (intent.tactic === 'steel') {
    actions.push({ kind: 'escalate_danger', note: 'Steel invites an immediate answer.' })
  } else if (intent.tactic === 'courtesy') {
    actions.push({ kind: 'affirm_tactic', note: 'Courtesy buys a suspended breath.' })
  } else {
    actions.push({ kind: 'call_bluff', note: 'The scene lets the player talk longer than is safe.' })
  }

  if (intent.truthfulness === 'bluff') {
    actions.push({ kind: 'misdirect', note: 'The room may entertain the lie before checking it.' })
  }

  return actions
}

function buildBeatScript(
  focus: 'hold' | 'tighten' | 'strike',
  lines: Array<{ text: string; tone?: SwordsDramaticBeatLine['tone'] }>,
) {
  return {
    focus,
    lines: lines.map(line => ({
      text: line.text,
      tone: line.tone ?? 'plain',
    })),
  }
}

function buildDealerChoiceBeatScript(input: {
  stage: SwordsOfChaosSceneStage
  place: string
  locus: ReturnType<typeof getSwordsEncounterLocus>
  openingChoice: SwordsOfChaosOpeningChoice
  secondChoice?: SwordsOfChaosSecondChoice
}): SwordsDramaticBeatScript | null {
  if (input.stage === 'opening') {
    switch (input.locus) {
      case 'space-station':
        if (input.openingChoice === 'bow-slightly') {
          return buildBeatScript('hold', [
            { text: 'You let the corridor decide whether it recognizes the gesture.' },
            { text: '', tone: 'quiet' },
            { text: 'A soft chime answers from somewhere that should no longer have power.', tone: 'sound' },
            { text: '', tone: 'quiet' },
            { text: 'Then the pressure door gives a tiny mechanical shiver, like a thought trying not to become a decision.', tone: 'accent' },
          ])
        }
        if (input.openingChoice === 'talk-like-you-belong') {
          return buildBeatScript('tighten', [
            { text: 'Your voice enters the static as if it expects to be obeyed.' },
            { text: '', tone: 'quiet' },
            { text: '*krk*', tone: 'sound' },
            { text: '', tone: 'quiet' },
            { text: 'An old speaker almost answers you, then thinks better of it.', tone: 'accent' },
          ])
        }
        return buildBeatScript('strike', [
          { text: 'You take the corridor like contested ground.' },
          { text: '', tone: 'quiet' },
          { text: '*clank*', tone: 'sound' },
          { text: '', tone: 'quiet' },
          { text: 'Something deeper in the ring has started moving in answer.', tone: 'accent' },
        ])
      case 'dark-dungeon':
        return buildBeatScript('hold', [
          { text: `You commit yourself to ${input.place} and let the dark hear that commitment.` },
          { text: '', tone: 'quiet' },
          { text: 'A faint *clank* answers from farther down than the stair should go.', tone: 'sound' },
          { text: '', tone: 'quiet' },
          { text: 'When your hand finds the wall, the stone feels softer than stone has any right to feel.', tone: 'accent' },
        ])
      case 'old-tree':
        return buildBeatScript('tighten', [
          { text: 'The roots do not move away from you. They make room.' },
          { text: '', tone: 'quiet' },
          { text: '*tik*', tone: 'sound' },
          { text: '', tone: 'quiet' },
          { text: 'Somewhere inside the trunk, a hidden mechanism has just admitted that it heard you.', tone: 'accent' },
        ])
      case 'ocean-ship':
        return buildBeatScript('hold', [
          { text: 'The deck takes your weight and answers by shifting under it.' },
          { text: '', tone: 'quiet' },
          { text: 'Below, something knocks once against the hatch, as if checking whether you truly mean to stay.', tone: 'sound' },
          { text: '', tone: 'quiet' },
          { text: 'The lantern swing slows, and for one second the whole ship seems to lean in your direction.', tone: 'accent' },
        ])
      default:
        return null
    }
  }

  switch (input.secondChoice) {
    case 'hold-the-line':
    case 'keep-bowing':
      return buildBeatScript('hold', [
        { text: 'You do not break the line you chose.' },
        { text: '', tone: 'quiet' },
        { text: 'That is when the hidden part of the scene has to decide whether to reveal itself or keep pretending it is only atmosphere.', tone: 'accent' },
      ])
    case 'ask-the-price':
    case 'meet-the-gaze':
      return buildBeatScript('tighten', [
        { text: 'You press the scene for an answer instead of release.' },
        { text: '', tone: 'quiet' },
        { text: '*tick*', tone: 'sound' },
        { text: '', tone: 'quiet' },
        { text: 'Something in the pressure around you shifts from mood into intention.', tone: 'accent' },
      ])
    case 'double-down':
    case 'cut-the-sign-chain':
      return buildBeatScript('strike', [
        { text: 'The choice lands too hard to take back now.' },
        { text: '', tone: 'quiet' },
        { text: 'The scene answers immediately, but not all at once.', tone: 'accent' },
      ])
    default:
      return null
  }
}

function buildCarryForwardDealerChoiceBeats(input: {
  stage: SwordsOfChaosSceneStage
  place: string
  locus: ReturnType<typeof getSwordsEncounterLocus>
  relevantMemory?: SwordsOfChaosRelevantMemory
}): SwordsDramaticBeatSegment[] {
  const carry = input.relevantMemory?.carryForward?.toLowerCase()
  if (!carry) {
    return []
  }

  const pressure = getSwordsCarryForwardPressure(input.relevantMemory, input.locus)
  const beats: SwordsDramaticBeatSegment[] = []
  const continuationLead = getSwordsContinuationLead(input.relevantMemory)
  const sceneStateLead = getSwordsSceneStateLead(input.relevantMemory)
  const magicLine = getSwordsMagicLine(input.relevantMemory, input.locus)

  if (pressure.length > 0 || continuationLead || sceneStateLead || magicLine) {
    beats.push({
      subtitle: `Last chapter is still in the room in ${input.place}.`,
      script: buildBeatScript('tighten', [
        {
          text:
            sceneStateLead ??
            continuationLead ??
            magicLine ??
            pressure[0] ??
            'The previous chapter has not finished arriving yet.',
        },
        { text: '', tone: 'quiet' },
        {
          text:
            input.stage === 'opening'
              ? 'Your committed move has already started pulling on that unfinished consequence.'
              : 'You are no longer only choosing inside a scene. You are choosing inside what the last scene changed.',
          tone: 'accent',
        },
      ]),
    })
  }

  if (input.relevantMemory?.continuation?.kind === 'watcher-pressure') {
    beats.push({
      subtitle: `Something continues to watch in ${input.place}.`,
      script: buildBeatScript('hold', [
        { text: 'A second silence arrives after the first one, and it is too deliberate to belong to empty architecture.' },
        { text: '', tone: 'quiet' },
        { text: 'Whatever learned to watch you last chapter has not gone blind between scenes.', tone: 'accent' },
      ]),
    })
  } else if (input.relevantMemory?.continuation?.kind === 'wrong-name-echo') {
    beats.push({
      subtitle: `The wrong name keeps working in ${input.place}.`,
      script: buildBeatScript('tighten', [
        { text: 'Somewhere ahead, the place rehearses the wrong version of itself under its breath.' },
        { text: '', tone: 'quiet' },
        { text: 'It no longer sounds accidental. It sounds practiced.', tone: 'accent' },
      ]),
    })
  } else if (input.relevantMemory?.continuation?.kind === 'oath-binding') {
    beats.push({
      subtitle: `The promise still has weight in ${input.place}.`,
      script: buildBeatScript('hold', [
        { text: 'The committed choice does not move alone. It drags a promise behind it.' },
        { text: '', tone: 'quiet' },
        { text: 'That changes the way the place is allowed to answer you.', tone: 'accent' },
      ]),
    })
  } else if (input.relevantMemory?.continuation?.kind === 'threshold-strain') {
    beats.push({
      subtitle: `A threshold is still deciding in ${input.place}.`,
      script: buildBeatScript('tighten', [
        { text: 'The boundary ahead feels less shut than occupied.' },
        { text: '', tone: 'quiet' },
        { text: 'Whatever you chose before taught this threshold to pay attention.', tone: 'accent' },
      ]),
    })
  } else if (input.relevantMemory?.continuation?.kind === 'relic-resonance') {
    beats.push({
      subtitle: `The relic consequence lingers in ${input.place}.`,
      script: buildBeatScript('strike', [
        { text: 'A shell-green glint appears where no glint should survive the light here.' },
        { text: '', tone: 'quiet' },
        { text: 'The last chapter left material proof behind, and this moment has just put your hand back near it.', tone: 'accent' },
      ]),
    })
  }

  return beats.slice(0, 2)
}

export function maybeBuildSwordsDealerChoiceBeat(input: {
  stage: SwordsOfChaosSceneStage
  openingChoice: SwordsOfChaosOpeningChoice
  secondChoice?: SwordsOfChaosSecondChoice
  relevantMemory?: SwordsOfChaosRelevantMemory
}): {
  beats: SwordsDramaticBeatSegment[]
} | null {
  const locus = getSwordsEncounterLocus(input.relevantMemory)
  const place = getSwordsEncounterPlaceName(locus)
  const script = buildDealerChoiceBeatScript({
    stage: input.stage,
    place,
    locus,
    openingChoice: input.openingChoice,
    secondChoice: input.secondChoice,
  })

  if (!script) {
    return null
  }

  const beats: SwordsDramaticBeatSegment[] = [
    {
      subtitle:
        input.stage === 'opening'
          ? `The scene takes your choice seriously in ${place}.`
          : `The consequence is still arriving in ${place}.`,
      script,
    },
  ]

  beats.push(
    ...buildCarryForwardDealerChoiceBeats({
      stage: input.stage,
      place,
      locus,
      relevantMemory: input.relevantMemory,
    }),
  )

  if (input.stage === 'opening') {
    if (locus === 'dark-dungeon') {
      beats.push({
        subtitle: `The dark keeps answering in ${place}.`,
        script: buildBeatScript('hold', [
          { text: 'The soft wall gives a little under your fingertips, as if breath were trapped behind the stone.' },
          { text: '', tone: 'quiet' },
          { text: 'Nothing rushes you. That is how this place tries to hurry you.', tone: 'accent' },
        ]),
      })
    } else if (locus === 'space-station' && input.openingChoice === 'bow-slightly') {
      beats.push({
        subtitle: `The station considers you in ${place}.`,
        script: buildBeatScript('tighten', [
          { text: 'A panel light that should be dead flickers once, then steadies.' },
          { text: '', tone: 'quiet' },
          { text: 'Some part of the ring has decided you are worth classifying before it decides whether you are welcome.', tone: 'accent' },
        ]),
      })
    }
  } else if (input.secondChoice === 'hold-the-line' || input.secondChoice === 'keep-bowing') {
    beats.push({
      subtitle: `The pressure gathers in ${place}.`,
      script: buildBeatScript('hold', [
        { text: 'You keep still long enough for the scene to become embarrassed by its own mask.' },
        { text: '', tone: 'quiet' },
        { text: 'Then the concealed part begins deciding how much of itself it can afford to show you.', tone: 'accent' },
      ]),
    })
  }

  if (input.relevantMemory?.continuation?.pacing === 'linger' && beats.length < 3) {
    beats.push({
      subtitle: `The scene refuses to hurry in ${place}.`,
      script: buildBeatScript('hold', [
        { text: input.relevantMemory.continuation.nextPressure },
        { text: '', tone: 'quiet' },
        { text: 'The story wants you to sit inside the consequence for one more beat before it asks for anything new.', tone: 'accent' },
      ]),
    })
  }

  if (
    input.relevantMemory?.sceneState?.status === 'revealing' &&
    beats.length < 3
  ) {
    beats.push({
      subtitle: `The scene is preparing to disclose itself in ${place}.`,
      script: buildBeatScript('tighten', [
        { text: input.relevantMemory.sceneState.pendingReveal },
        { text: '', tone: 'quiet' },
        { text: 'You are still inside the consequence of a choice already made. The next reveal belongs to that choice, not to a fresh menu.', tone: 'accent' },
      ]),
    })
  }

  return {
    beats,
  }
}

export function maybeBuildSwordsSceneStateBeat(input: {
  openingChoice: SwordsOfChaosOpeningChoice
  relevantMemory?: SwordsOfChaosRelevantMemory
}): {
  beats: SwordsDramaticBeatSegment[]
} | null {
  const sceneState = input.relevantMemory?.sceneState
  if (!sceneState) {
    return null
  }

  const locus = getSwordsEncounterLocus(input.relevantMemory)
  const place = getSwordsEncounterPlaceName(locus)

  const primary: SwordsDramaticBeatSegment = {
    subtitle: `The committed scene keeps unfolding in ${place}.`,
    script: buildBeatScript(
      sceneState.status === 'revealing' ? 'tighten' : 'hold',
      [
        { text: sceneState.commitment },
        { text: '', tone: 'quiet' },
        { text: sceneState.hazard, tone: 'accent' },
      ],
    ),
  }

  const beats: SwordsDramaticBeatSegment[] = [primary]

  if (sceneState.status === 'revealing' || sceneState.status === 'complicating') {
    beats.push({
      subtitle: `The next reveal belongs to the choice already made in ${place}.`,
      script: buildBeatScript('tighten', [
        { text: sceneState.pendingReveal },
        { text: '', tone: 'quiet' },
        {
          text: 'The scene is still cashing the intent you already committed to, so it withholds the next real choice for one more beat.',
          tone: 'accent',
        },
      ]),
    })
  }

  return {
    beats,
  }
}

function buildSecondBeatActions(
  intent: SwordsFreeResponseIntent,
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): SwordsDmAction[] {
  const actions: SwordsDmAction[] = []

  if (intent.risk === 'high') {
    actions.push({ kind: 'hard_consequence', note: 'A high-risk move sharpens the scene immediately.' })
  } else if (intent.tone === 'careful') {
    actions.push({ kind: 'reveal_clue', note: 'Restraint gives the place a chance to show something.' })
  } else {
    actions.push({ kind: 'soft_fail_forward', note: 'The DM advances the scene without shutting the player down.' })
  }

  if (intent.truthfulness === 'bluff') {
    actions.push({ kind: 'call_bluff', note: 'The world decides whether to test or accept the lie.' })
  }

  if (relevantMemory?.seaturtleGlimpsed && intent.tone === 'careful') {
    actions.push({ kind: 'seaturtle_brush', note: 'A quieter line invites a rare SeaTurtle brush.' })
  }

  if (relevantMemory?.characterDevelopment?.focus === 'witness' && intent.target === 'witness') {
    actions.push({ kind: 'reveal_clue', note: 'A witness-shaped character pressure makes the hidden observer more likely to answer.' })
  }

  if (relevantMemory?.characterDevelopment?.focus === 'edge' && intent.risk === 'high') {
    actions.push({ kind: 'hard_consequence', note: 'The world is already testing what you do with force.' })
  }

  return actions
}

function buildOpeningLines(
  place: string,
  intent: SwordsFreeResponseIntent,
): ReturnType<typeof buildBeatScript> {
  switch (intent.tactic) {
    case 'steel':
      return buildBeatScript('strike', [
        { text: `You move for steel before ${place} can pretend not to notice.`, tone: 'plain' },
        { text: '', tone: 'quiet' },
        { text: '*tink*', tone: 'sound' },
        { text: '', tone: 'quiet' },
        { text: 'Something answers the blade faster than comfort allows.', tone: 'accent' },
      ])
    case 'courtesy':
      return buildBeatScript('hold', [
        { text: 'You choose restraint on purpose.' },
        { text: '', tone: 'quiet' },
        { text: `For one measured breath, ${place} does the same.`, tone: 'quiet' },
        { text: '', tone: 'quiet' },
        { text: 'Then the moment tightens around the choice.', tone: 'accent' },
      ])
    case 'question':
      return buildBeatScript('tighten', [
        { text: 'You speak first, but not with a bluff.' },
        { text: '', tone: 'quiet' },
        { text: 'The question lands and the room has to decide whether to answer it or punish it.', tone: 'accent' },
      ])
    case 'observe':
      return buildBeatScript('hold', [
        { text: 'You give the scene one more second than it expected to receive.' },
        { text: '', tone: 'quiet' },
        { text: 'That is often when the hidden part shows itself.', tone: 'accent' },
      ])
    default:
      return buildBeatScript('tighten', [
        { text: 'You commit to the move in your own words.' },
        { text: '', tone: 'quiet' },
        { text: `That is enough for ${place} to answer the intent, not just the phrasing.`, tone: 'accent' },
      ])
  }
}

function buildSecondBeatLines(
  place: string,
  intent: SwordsFreeResponseIntent,
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): ReturnType<typeof buildBeatScript> {
  const reaction = getSwordsCharacterReactionLine(
    relevantMemory,
    getSwordsEncounterLocus(relevantMemory),
  )
  const temptation = getSwordsCharacterTemptationLine(relevantMemory)

  if (intent.risk === 'high') {
    return buildBeatScript('strike', [
      { text: 'You press harder instead of backing off.' },
      { text: '', tone: 'quiet' },
      { text: `The pressure in ${place} sharpens at once.`, tone: 'accent' },
      { text: '', tone: 'quiet' },
      { text: reaction ?? 'Now something has to answer cleanly.', tone: 'plain' },
    ])
  }

  if (intent.tone === 'careful') {
    return buildBeatScript('hold', [
      { text: 'You choose a quieter line than the scene expected.' },
      { text: '', tone: 'quiet' },
      {
        text:
          relevantMemory?.seaturtleGlimpsed
            ? `That forces ${place} to reveal more of itself, and something rarer almost brushes the edge of the moment.`
            : `That forces ${place} to reveal more of itself than it wanted to.`,
        tone: 'accent',
      },
      ...(temptation ? [{ text: '', tone: 'quiet' as const }, { text: temptation, tone: 'plain' as const }] : []),
    ])
  }

  if (intent.truthfulness === 'bluff') {
    return buildBeatScript('tighten', [
      { text: 'You let the lie keep walking on its own feet.' },
      { text: '', tone: 'quiet' },
      {
        text:
          intent.risk === 'high'
            ? 'For one dangerous second, even the room seems tempted to adopt it.'
            : 'For a moment, even the room seems tempted to adopt it.',
        tone: 'accent',
      },
      ...(reaction ? [{ text: '', tone: 'quiet' as const }, { text: reaction, tone: 'plain' as const }] : []),
    ])
  }

  return buildBeatScript('tighten', [
    { text: 'You make the move in your own words, and the scene takes it seriously.' },
    { text: '', tone: 'quiet' },
    { text: `Now ${place} has to answer the intent behind it.`, tone: 'accent' },
    ...(reaction ? [{ text: '', tone: 'quiet' as const }, { text: reaction, tone: 'plain' as const }] : []),
  ])
}

export function adjudicateSwordsFreeResponse(input: {
  stage: SwordsOfChaosSceneStage
  text: string
  openingChoice?: SwordsOfChaosOpeningChoice | null
  relevantMemory?: SwordsOfChaosRelevantMemory
}): SwordsDmAdjudication {
  const intent = classifySwordsFreeResponse({
    stage: input.stage,
    text: input.text,
    openingChoice: input.openingChoice,
  })
  const locus = getSwordsEncounterLocus(input.relevantMemory)
  const place = getSwordsEncounterPlaceName(locus)

  if (input.stage === 'opening') {
    const openingChoice = intent.mappedOpeningChoice
    return {
      stage: input.stage,
      locus,
      openingChoice,
      actions: buildOpeningActions(intent),
      tension: intent.risk === 'high' ? 'sharp' : 'live',
      subtitle: `The DM answers the move you chose in ${place}.`,
      beatScript: buildOpeningLines(place, intent),
      intent,
      relevantMemory: input.relevantMemory,
    }
  }

  const secondChoice = intent.mappedSecondChoice
  return {
    stage: input.stage,
    locus,
    openingChoice: input.openingChoice ?? undefined,
    secondChoice,
    actions: buildSecondBeatActions(intent, input.relevantMemory),
    tension: intent.risk === 'high' ? 'sharp' : 'live',
    subtitle: `The scene answers the move you made in ${place}.`,
    beatScript: buildSecondBeatLines(place, intent, input.relevantMemory),
    intent,
    relevantMemory: input.relevantMemory,
  }
}
