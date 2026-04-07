import { getSwordsEncounterLocus, getSwordsEncounterPlaceName } from './worldMap.js'
import type { SwordsOfChaosSceneStage } from '../types/dm.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosOpeningChoice, SwordsOfChaosSecondChoice } from '../types/outcomes.js'
import type {
  SwordsDmAction,
  SwordsDmAdjudication,
  SwordsDramaticBeatLine,
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
  if (intent.risk === 'high') {
    return buildBeatScript('strike', [
      { text: 'You press harder instead of backing off.' },
      { text: '', tone: 'quiet' },
      { text: `The pressure in ${place} sharpens at once.`, tone: 'accent' },
      { text: '', tone: 'quiet' },
      { text: 'Now something has to answer cleanly.', tone: 'plain' },
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
    ])
  }

  return buildBeatScript('tighten', [
    { text: 'You make the move in your own words, and the scene takes it seriously.' },
    { text: '', tone: 'quiet' },
    { text: `Now ${place} has to answer the intent behind it.`, tone: 'accent' },
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
