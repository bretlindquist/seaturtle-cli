import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import TextInput from '../../components/TextInput.js'
import type { OptionWithDescription } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Box, Text, useInterval } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  getCtArchiveSummary,
  getCtCanonCallback,
} from '../../services/projectIdentity/canonCallbacks.js'
import {
  getCtProjectRoot,
} from '../../services/projectIdentity/paths.js'
import {
  markGameCommandDiscovered,
  readCtGameState,
  recordCtGameResult,
  addLegendEvent,
  addInventoryItem,
  addTitle,
  addOath,
  addUserTruth,
  addRarityUnlock,
  updateCtGameState,
} from '../../services/projectIdentity/archives.js'
import {
  TIDE_DICE_REWARDS,
  WAGER_REWARDS,
} from '../../services/game/rewards.js'
import {
  adjudicateSwordsFreeResponse,
  applySwordsOfChaosOutcomeEchoes,
  applySwordsOfChaosEventBatchToSave,
  buildSwordsProceduralOptions,
  completeSwordsSessionZero,
  ensureSwordsOfChaosRuntimeReady,
  finalizeSwordsCustomCharacter,
  finalizeSwordsPremadeCharacter,
  finalizeSwordsProceduralCharacter,
  getSwordsCharacterCreationOptions,
  getSwordsCustomCharacterFields,
  getSwordsEncounterLocus,
  getSwordsEncounterPlaceName,
  getSwordsOfChaosRelevantMemory,
  getSwordsOfChaosRetreatNarration,
  getSwordsOpeningLabel,
  getSwordsPremadeCharacterOptions,
  getSwordsSessionZeroPreludeCopy,
  getSwordsSessionZeroScene,
  recordSwordsOfChaosRetreat,
  renderSwordsOfChaosHybridScene,
  resolveSwordsOfChaosRoute,
  swordsNeedsCharacterCreation,
  swordsNeedsSessionZero,
  type SwordsCharacterCustomField,
  type SwordsCharacterProceduralOption,
  type SwordsDramaticBeatLine,
  type SwordsDramaticBeatScript,
  type SwordsOfChaosCreationMode,
  type SwordsOfChaosOpeningChoice,
  type SwordsOfChaosSecondChoice,
  type SwordsOfChaosDmSceneResponse,
} from '../../services/swordsOfChaos/index.js'

type OnExit = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type Screen =
  | 'menu'
  | 'wager'
  | 'tide-dice'
  | 'swords-character-intro'
  | 'swords-character-name'
  | 'swords-character-sheet'
  | 'swords-custom-character'
  | 'swords-session-zero'
  | 'swords-free-response'
  | 'swords-dramatic-beat'
  | 'swords-of-chaos'
  | 'archives'
  | 'result'

type SwordsEncounter = {
  openingChoice: SwordsOfChaosOpeningChoice | null
}

type SwordsCharacterCreationState = {
  mode: SwordsOfChaosCreationMode | null
  name: string
  nameCursorOffset: number
  error: string | null
  proceduralOptions: SwordsCharacterProceduralOption[]
  customChoices: Partial<Record<SwordsCharacterCustomField, string>>
  customFieldIndex: number
}

type SwordsFreeResponseState = {
  stage: 'opening' | 'second-beat'
  openingChoice: SwordsOfChaosOpeningChoice | null
  text: string
  cursorOffset: number
  error: string | null
}

type SwordsDramaticBeatState = {
  title: string
  subtitle: string
  focus: SwordsDramaticBeatScript['focus']
  lines: SwordsDramaticBeatLine[]
  revealed: number
  followup:
    | {
        type: 'opening'
        openingChoice: SwordsOfChaosOpeningChoice
      }
    | {
        type: 'result'
        openingChoice: SwordsOfChaosOpeningChoice
        secondChoice: SwordsOfChaosSecondChoice
      }
    | null
}

function buildSwordsOpeningBeat(
  openingChoice: SwordsOfChaosOpeningChoice,
  place: string,
): SwordsDramaticBeatScript {
  switch (openingChoice) {
    case 'draw-steel':
      return {
        focus: 'strike',
        lines: [
          { text: `Your hand finds the hilt before ${place} decides whether it knows you.`, tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: 'Rain ticks against metal.', tone: 'quiet' },
          { text: '', tone: 'quiet' },
          { text: '*tink*', tone: 'sound' },
          { text: '', tone: 'quiet' },
          {
            text: 'A blade meets yours sooner than it should. Someone here was faster than the moment.',
            tone: 'accent',
          },
        ],
      }
    case 'bow-slightly':
      return {
        focus: 'hold',
        lines: [
          { text: 'You dip your head just enough to make the gesture deliberate.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: `For one suspended breath, ${place} answers by holding still with you.`, tone: 'quiet' },
          { text: '', tone: 'quiet' },
          { text: 'Then the room remembers it is dangerous.', tone: 'accent' },
        ],
      }
    case 'talk-like-you-belong':
      return {
        focus: 'tighten',
        lines: [
          { text: 'The words leave your mouth with more confidence than permission.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: 'No one interrupts.', tone: 'quiet' },
          { text: '', tone: 'quiet' },
          { text: 'Which is worse.', tone: 'accent' },
          { text: '', tone: 'quiet' },
          {
            text: `Something in ${place} lets you keep talking just to hear what you will dare next.`,
            tone: 'accent',
          },
        ],
      }
  }
}

function buildSwordsSecondBeat(
  secondChoice: SwordsOfChaosSecondChoice,
  place: string,
): SwordsDramaticBeatScript {
  switch (secondChoice) {
    case 'cut-the-sign-chain':
      return {
        focus: 'strike',
        lines: [
          { text: `You move first, and ${place} answers at once.`, tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: 'Metal protests. Something hidden wakes up angry.', tone: 'accent' },
        ],
      }
    case 'hold-the-line':
      return {
        focus: 'hold',
        lines: [
          { text: 'You hold your ground.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          {
            text: `That is when ${place} has to reveal whether it wanted your fear or your steadiness.`,
            tone: 'accent',
          },
        ],
      }
    case 'lower-the-blade':
      return {
        focus: 'tighten',
        lines: [
          { text: 'You refuse the obvious script.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: 'The moment wobbles. Something that expected violence has to improvise.', tone: 'accent' },
        ],
      }
    case 'keep-bowing':
      return {
        focus: 'hold',
        lines: [
          { text: 'You stay with the gesture longer than comfort would advise.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: `That is long enough for ${place} to understand you meant it.`, tone: 'accent' },
        ],
      }
    case 'meet-the-gaze':
      return {
        focus: 'tighten',
        lines: [
          { text: 'You lift your eyes instead of your guard.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          {
            text: 'Whatever was watching has to decide whether that counts as courage or invitation.',
            tone: 'accent',
          },
        ],
      }
    case 'ask-the-price':
      return {
        focus: 'tighten',
        lines: [
          { text: 'You ask the question that turns a mood into a bargain.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: `In ${place}, that is usually when the real danger starts listening.`, tone: 'accent' },
        ],
      }
    case 'name-a-false-title':
      return {
        focus: 'tighten',
        lines: [
          { text: 'You give the lie a proper name and let it stand upright.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: 'For a second, even the room seems tempted to believe you.', tone: 'accent' },
        ],
      }
    case 'laugh-like-you-mean-it':
      return {
        focus: 'tighten',
        lines: [
          { text: 'You laugh at exactly the wrong moment.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: 'Which is sometimes the closest thing to a key the world will accept.', tone: 'accent' },
        ],
      }
    case 'double-down':
      return {
        focus: 'strike',
        lines: [
          { text: 'You keep going past the point where caution would have shut up.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: `Now ${place} has to decide whether to expose you or take your side.`, tone: 'accent' },
        ],
      }
    default:
      return {
        focus: 'tighten',
        lines: [
          { text: 'The scene shifts under the weight of what you chose.', tone: 'plain' },
          { text: '', tone: 'quiet' },
          { text: 'Whatever happens next belongs to the choice now.', tone: 'accent' },
        ],
      }
  }
}

function renderBeatLine(
  line: SwordsDramaticBeatLine,
  index: number,
): React.ReactNode {
  if (line.text === '') {
    return <Text key={`blank-${index}`}>{' '}</Text>
  }

  const key = `${index}-${line.text}`

  if (line.tone === 'sound') {
    return (
      <Text key={key} color="warning">
        {line.text}
      </Text>
    )
  }

  if (line.tone === 'accent') {
    return (
      <Text key={key} color="primary">
        {line.text}
      </Text>
    )
  }

  if (line.tone === 'quiet') {
    return (
      <Text key={key} dimColor italic>
        {line.text}
      </Text>
    )
  }

  return <Text key={key} dimColor>{line.text}</Text>
}

function GameCommand({ onExit }: { onExit: OnExit }): React.ReactNode {
  const [screen, setScreen] = React.useState<Screen>('menu')
  const [swordsEncounter, setSwordsEncounter] = React.useState<SwordsEncounter>({
    openingChoice: null,
  })
  const [resultMessage, setResultMessage] = React.useState<string | null>(null)
  const [swordsCreation, setSwordsCreation] =
    React.useState<SwordsCharacterCreationState>({
      mode: null,
      name: '',
      nameCursorOffset: 0,
      error: null,
      proceduralOptions: [],
      customChoices: {},
      customFieldIndex: 0,
    })
  const [swordsFreeResponse, setSwordsFreeResponse] =
    React.useState<SwordsFreeResponseState>({
      stage: 'opening',
      openingChoice: null,
      text: '',
      cursorOffset: 0,
      error: null,
    })
  const [swordsDramaticBeat, setSwordsDramaticBeat] =
    React.useState<SwordsDramaticBeatState>({
      title: 'Swords of Chaos ⚔️🐉🏆',
      subtitle: 'The game holds its breath.',
      focus: 'hold',
      lines: [],
      revealed: 0,
      followup: null,
    })
  const projectRoot = getCtProjectRoot()
  const archiveSummary = getCtArchiveSummary(projectRoot)
  const canonCallback = getCtCanonCallback(projectRoot)
  const gameState = readCtGameState(projectRoot)
  const [swordsRuntimeSave, setSwordsRuntimeSave] = React.useState(() =>
    ensureSwordsOfChaosRuntimeReady(),
  )
  const swordsRelevantMemory = React.useMemo(
    () => getSwordsOfChaosRelevantMemory(swordsRuntimeSave),
    [swordsRuntimeSave],
  )
  const swordsOpeningScene = React.useMemo<SwordsOfChaosDmSceneResponse>(
    () =>
      renderSwordsOfChaosHybridScene({
        stage: 'opening',
        relevantMemory: swordsRelevantMemory,
      }),
    [swordsRelevantMemory],
  )
  const swordsEncounterLocus = getSwordsEncounterLocus(swordsRelevantMemory)
  const swordsEncounterPlace = getSwordsEncounterPlaceName(swordsEncounterLocus)
  const swordsEncounterPlaceLabel =
    swordsEncounterPlace.charAt(0).toUpperCase() + swordsEncounterPlace.slice(1)
  const swordsNeedsCreation = swordsNeedsCharacterCreation(swordsRuntimeSave)
  const swordsNeedsPrelude = swordsNeedsSessionZero(swordsRuntimeSave)
  const swordsSessionZeroPrelude = getSwordsSessionZeroPreludeCopy()
  const swordsSessionZeroScene = React.useMemo(
    () =>
      swordsNeedsPrelude ? getSwordsSessionZeroScene(swordsRuntimeSave) : null,
    [swordsNeedsPrelude, swordsRuntimeSave],
  )
  const swordsCustomFields = React.useMemo(
    () => getSwordsCustomCharacterFields(),
    [],
  )
  const activeCustomField = swordsCustomFields[swordsCreation.customFieldIndex]

  useInterval(
    () => {
      setSwordsDramaticBeat(current => ({
        ...current,
        revealed: Math.min(current.revealed + 1, current.lines.length),
      }))
    },
    screen === 'swords-dramatic-beat' &&
      swordsDramaticBeat.revealed < swordsDramaticBeat.lines.length
      ? swordsDramaticBeat.focus === 'strike'
        ? 170
        : swordsDramaticBeat.focus === 'tighten'
          ? 230
          : 300
      : null,
  )

  function resetSwordsCreationState(mode: SwordsOfChaosCreationMode | null = null) {
    setSwordsCreation({
      mode,
      name: '',
      nameCursorOffset: 0,
      error: null,
      proceduralOptions: [],
      customChoices: {},
      customFieldIndex: 0,
    })
  }

  function showResult(result: string): void {
    setResultMessage(result)
    setScreen('result')
  }

  function beginSwordsFreeResponse(
    stage: 'opening' | 'second-beat',
    openingChoice: SwordsOfChaosOpeningChoice | null = null,
  ): void {
    setSwordsFreeResponse({
      stage,
      openingChoice,
      text: '',
      cursorOffset: 0,
      error: null,
    })
    setScreen('swords-free-response')
  }

  function beginSwordsDramaticBeat(input: {
    subtitle: string
    script: SwordsDramaticBeatScript
    followup: SwordsDramaticBeatState['followup']
  }): void {
    setSwordsDramaticBeat({
      title: 'Swords of Chaos ⚔️🐉🏆',
      subtitle: input.subtitle,
      focus: input.script.focus,
      lines: input.script.lines,
      revealed: 0,
      followup: input.followup,
    })
    setScreen('swords-dramatic-beat')
  }

  function continueSwordsDramaticBeat(): void {
    if (!swordsDramaticBeat.followup) {
      setScreen('swords-of-chaos')
      return
    }

    if (swordsDramaticBeat.followup.type === 'opening') {
      setSwordsEncounter({
        openingChoice: swordsDramaticBeat.followup.openingChoice,
      })
      setScreen('swords-of-chaos')
      return
    }

    finishSwordsOfChaos(
      swordsDramaticBeat.followup.openingChoice,
      swordsDramaticBeat.followup.secondChoice,
    )
  }

  function beginSwordsOfChaos(): void {
    setSwordsEncounter({
      openingChoice: null,
    })

    if (swordsNeedsCreation) {
      resetSwordsCreationState()
      setScreen('swords-character-intro')
      return
    }

    if (swordsNeedsPrelude) {
      setScreen('swords-session-zero')
      return
    }

    setScreen('swords-of-chaos')
  }

  function handleSwordsCreationMode(mode: SwordsOfChaosCreationMode): void {
    resetSwordsCreationState(mode)
    setScreen('swords-character-name')
  }

  function handleSwordsCharacterNameSubmit(value: string): void {
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setSwordsCreation(current => ({
        ...current,
        error: 'Give the character at least a short true name.',
      }))
      return
    }

    if (!swordsCreation.mode) {
      setSwordsCreation(current => ({
        ...current,
        error: 'Choose a creation path before naming the character.',
      }))
      setScreen('swords-character-intro')
      return
    }

    if (swordsCreation.mode === 'procedural') {
      setSwordsCreation(current => ({
        ...current,
        name: trimmed,
        nameCursorOffset: trimmed.length,
        error: null,
        proceduralOptions: buildSwordsProceduralOptions(trimmed),
      }))
      setScreen('swords-character-sheet')
      return
    }

    setSwordsCreation(current => ({
      ...current,
      name: trimmed,
      nameCursorOffset: trimmed.length,
      error: null,
    }))
    setScreen(
      swordsCreation.mode === 'custom'
        ? 'swords-custom-character'
        : 'swords-character-sheet',
    )
  }

  function finalizeSwordsCharacterFromSelection(value: string): void {
    try {
      if (swordsCreation.mode === 'premade') {
        const next = finalizeSwordsPremadeCharacter(swordsCreation.name, value)
        setSwordsRuntimeSave(next)
        setScreen('swords-session-zero')
        return
      }

      if (swordsCreation.mode === 'procedural') {
        const option = swordsCreation.proceduralOptions.find(
          item => item.id === value,
        )
        if (!option) {
          throw new Error('That procedural life is no longer available.')
        }
        const next = finalizeSwordsProceduralCharacter(
          swordsCreation.name,
          option,
        )
        setSwordsRuntimeSave(next)
        setScreen('swords-session-zero')
      }
    } catch (error) {
      setSwordsCreation(current => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to build character.',
      }))
    }
  }

  function finalizeSwordsCustomCharacterChoice(value: string): void {
    if (!activeCustomField) {
      return
    }

    const nextChoices = {
      ...swordsCreation.customChoices,
      [activeCustomField.field]: value,
    }

    const isLastField =
      swordsCreation.customFieldIndex >= swordsCustomFields.length - 1

    if (!isLastField) {
      setSwordsCreation(current => ({
        ...current,
        customChoices: nextChoices,
        customFieldIndex: current.customFieldIndex + 1,
        error: null,
      }))
      return
    }

    try {
      const next = finalizeSwordsCustomCharacter(
        swordsCreation.name,
        nextChoices as Record<SwordsCharacterCustomField, string>,
      )
      setSwordsRuntimeSave(next)
      setScreen('swords-session-zero')
    } catch (error) {
      setSwordsCreation(current => ({
        ...current,
        customChoices: nextChoices,
        error: error instanceof Error ? error.message : 'Failed to build character.',
      }))
    }
  }

  function finishSwordsSessionZero(choiceId: string): void {
    const next = completeSwordsSessionZero(swordsRuntimeSave, choiceId)
    setSwordsRuntimeSave(next)
    setScreen('swords-of-chaos')
  }

  function finishWager(choice: 'ride-the-tide' | 'trust-the-shell'): void {
    const won = Math.random() >= 0.5

    updateCtGameState(
      current => ({
        ...current,
        lastPlayedAt: Date.now(),
        discoveries: {
          ...current.discoveries,
          wagerPlayed: true,
        },
      }),
      projectRoot,
    )

    if (won) {
      recordCtGameResult('win', projectRoot)
      addLegendEvent(
        `Won a wager with the Mighty SeaTurtle by choosing ${choice === 'ride-the-tide' ? 'Ride the Tide' : 'Trust the Shell'}.`,
        projectRoot,
      )
      addInventoryItem(WAGER_REWARDS.inventory, projectRoot)
      addRarityUnlock(WAGER_REWARDS.rarityUnlock, projectRoot)
      addTitle(WAGER_REWARDS.title, projectRoot)
      showResult(
        `You won the wager.\n\nThe Mighty SeaTurtle nods once, as if this outcome was obvious all along.\n\nArchive updates:\n- title: ${WAGER_REWARDS.title}\n- inventory: ${WAGER_REWARDS.inventory}\n- rarity unlock: ${WAGER_REWARDS.rarityUnlock}`,
      )
      return
    }

    recordCtGameResult('loss', projectRoot)
    addLegendEvent(
      `Lost a wager with the Mighty SeaTurtle after choosing ${choice === 'ride-the-tide' ? 'Ride the Tide' : 'Trust the Shell'}.`,
      projectRoot,
    )
    showResult(
      'You lost the wager.\n\nThe Mighty SeaTurtle says nothing, which somehow makes it worse.\n\nThe loss is recorded in the Half-Shell Archives.',
    )
  }

  function finishTideDiceRoll(): void {
    const roll = Math.floor(Math.random() * 6) + 1

    updateCtGameState(
      current => ({
        ...current,
        lastPlayedAt: Date.now(),
        discoveries: {
          ...current.discoveries,
          tideDicePlayed: true,
        },
      }),
      projectRoot,
    )

    if (roll === 6) {
      recordCtGameResult('win', projectRoot)
      addLegendEvent(`Rolled a perfect 6 in Roll the Tide Dice.`, projectRoot)
      addInventoryItem(TIDE_DICE_REWARDS.inventory, projectRoot)
      addRarityUnlock(TIDE_DICE_REWARDS.rarityUnlock, projectRoot)
      showResult(
        `You rolled a ${roll}.\n\nThe tide rises in your favor.\n\nArchive updates:\n- inventory: ${TIDE_DICE_REWARDS.inventory}\n- rarity unlock: ${TIDE_DICE_REWARDS.rarityUnlock}`,
      )
      return
    }

    if (roll >= 4) {
      recordCtGameResult('played', projectRoot)
      addLegendEvent(`Rolled a steady ${roll} in Roll the Tide Dice.`, projectRoot)
      showResult(
        `You rolled a ${roll}.\n\nNot a triumph. Not a disaster. The tide simply acknowledges you and moves on.`,
      )
      return
    }

    recordCtGameResult('loss', projectRoot)
    addLegendEvent(`Rolled a rough ${roll} in Roll the Tide Dice.`, projectRoot)
    showResult(
      `You rolled a ${roll}.\n\nThe tide takes this round without apology.\n\nThe loss is recorded in the Half-Shell Archives.`,
    )
  }

  function finishSwordsOfChaos(
    openingChoice: SwordsOfChaosOpeningChoice,
    secondChoice: SwordsOfChaosSecondChoice,
  ): void {
    const resolution = resolveSwordsOfChaosRoute(openingChoice, secondChoice, {
      encounterLocus: getSwordsEncounterLocus(swordsRelevantMemory),
      seaturtleWitnessed: swordsRelevantMemory.seaturtleGlimpsed,
    })
    const outcome = resolution.outcome

    updateCtGameState(
      current => ({
        ...current,
        lastPlayedAt: Date.now(),
        discoveries: {
          ...current.discoveries,
          swordsOfChaosPlayed: true,
        },
      }),
      projectRoot,
    )
    const nextSave = applySwordsOfChaosEventBatchToSave(resolution.eventBatch)
    setSwordsRuntimeSave(nextSave)

    recordCtGameResult(outcome.gameResult, projectRoot)
    applySwordsOfChaosOutcomeEchoes(resolution.hostEchoes, projectRoot)
    if (resolution.rarityUnlock) {
      addRarityUnlock(resolution.rarityUnlock, projectRoot)
    }
    showResult(resolution.resultText)
  }

  function retreatFromSwordsOfChaos(
    stage: 'opening' | 'second-beat',
    openingChoice?: SwordsOfChaosOpeningChoice,
  ): void {
    recordSwordsOfChaosRetreat(stage)
    showResult(
      getSwordsOfChaosRetreatNarration({
        stage,
        openingChoice,
        relevantMemory: swordsRelevantMemory,
      }),
    )
  }

  function submitSwordsFreeResponse(value: string): void {
    const trimmed = value.trim()
    if (trimmed.length < 3) {
      setSwordsFreeResponse(current => ({
        ...current,
        error: 'Give the DM a real move to work with.',
      }))
      return
    }

    if (swordsFreeResponse.stage === 'opening') {
      const adjudication = adjudicateSwordsFreeResponse({
        stage: 'opening',
        text: trimmed,
        relevantMemory: swordsRelevantMemory,
      })
      const interpretedChoice = adjudication.openingChoice
      if (!interpretedChoice) {
        setSwordsFreeResponse(current => ({
          ...current,
          error: 'The DM could not settle on how that move entered the scene.',
        }))
        return
      }
      beginSwordsDramaticBeat({
        subtitle: adjudication.subtitle,
        script: adjudication.beatScript,
        followup: {
          type: 'opening',
          openingChoice: interpretedChoice,
        },
      })
      return
    }

    if (!swordsFreeResponse.openingChoice) {
      setSwordsFreeResponse(current => ({
        ...current,
        error: 'The scene lost track of the opening move.',
      }))
      return
    }

    const adjudication = adjudicateSwordsFreeResponse({
      stage: 'second-beat',
      text: trimmed,
      openingChoice: swordsFreeResponse.openingChoice,
      relevantMemory: swordsRelevantMemory,
    })
    const interpretedChoice = adjudication.secondChoice
    if (!interpretedChoice) {
      setSwordsFreeResponse(current => ({
        ...current,
        error: 'The DM could not tell what kind of second move that was.',
      }))
      return
    }
    beginSwordsDramaticBeat({
      subtitle: adjudication.subtitle,
      script: adjudication.beatScript,
      followup: {
        type: 'result',
        openingChoice: swordsFreeResponse.openingChoice,
        secondChoice: interpretedChoice,
      },
    })
  }

  if (screen === 'wager') {
    return (
      <Dialog
        title="Wager with the Mighty SeaTurtle"
        subtitle="Pick a lane and accept the tide. Quiet stakes, private consequences."
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            One wager. One turn of the tide. The archives will remember the
            outcome.
          </Text>
          <Select
            options={[
              {
                label: 'Ride the Tide',
                value: 'ride-the-tide',
                description: 'Trust motion, timing, and dangerous optimism',
              },
              {
                label: 'Trust the Shell',
                value: 'trust-the-shell',
                description: 'Trust patience, armor, and stubborn certainty',
              },
              {
                label: 'Back away slowly',
                value: 'back',
                description: 'Return to the hidden shell without wagering',
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                setScreen('menu')
                return
              }

              finishWager(value as 'ride-the-tide' | 'trust-the-shell')
            }}
            onCancel={() => setScreen('menu')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'tide-dice') {
    return (
      <Dialog
        title="Roll the Tide Dice"
        subtitle="One throw. No bargaining. The tide keeps the ledger."
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Roll once and live with whatever washes ashore.
          </Text>
          <Select
            options={[
              {
                label: 'Roll the Tide Dice',
                value: 'roll',
                description: 'Let the tide choose a number from 1 to 6',
              },
              {
                label: 'Back away slowly',
                value: 'back',
                description: 'Return to the hidden shell without rolling',
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                setScreen('menu')
                return
              }

              finishTideDiceRoll()
            }}
            onCancel={() => setScreen('menu')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-character-intro') {
    return (
      <Dialog
        title={swordsSessionZeroPrelude.title}
        subtitle={swordsSessionZeroPrelude.subtitle}
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{swordsSessionZeroPrelude.sceneText}</Text>
          <Text dimColor>{swordsSessionZeroPrelude.promptText}</Text>
          <Select
            options={[
              ...getSwordsCharacterCreationOptions().map(option => ({
                label: option.label,
                value: option.mode,
                description: option.description,
              })),
              {
                label: 'Back away before the story starts',
                value: 'back',
                description: 'Return to the hidden shell without beginning a character',
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                setScreen('menu')
                return
              }

              handleSwordsCreationMode(value as SwordsOfChaosCreationMode)
            }}
            onCancel={() => setScreen('menu')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-character-name') {
    return (
      <Dialog
        title="Swords of Chaos ⚔️🐉🏆"
        subtitle="Every legend starts with a name someone chooses to answer to."
        onCancel={() => setScreen('swords-character-intro')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Give your character a name. Class, origin, and omen can come from
            the world. This part should come from you.
          </Text>
          {swordsCreation.error ? (
            <Text color="error">{swordsCreation.error}</Text>
          ) : null}
          <TextInput
            value={swordsCreation.name}
            onChange={value =>
              setSwordsCreation(current => ({
                ...current,
                name: value,
                nameCursorOffset: value.length,
                error: null,
              }))
            }
            onSubmit={handleSwordsCharacterNameSubmit}
            placeholder="Name your character..."
            columns={60}
            cursorOffset={swordsCreation.nameCursorOffset}
            onChangeCursorOffset={cursorOffset =>
              setSwordsCreation(current => ({
                ...current,
                nameCursorOffset: cursorOffset,
              }))
            }
            focus
            showCursor
          />
          <Text dimColor>Press Enter to continue.</Text>
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-character-sheet') {
    const options: OptionWithDescription<string>[] =
      swordsCreation.mode === 'procedural'
        ? swordsCreation.proceduralOptions.map(option => ({
            label: option.label,
            value: option.id,
            description: option.hook,
          }))
        : getSwordsPremadeCharacterOptions().map(option => ({
            label: option.label,
            value: option.id,
            description: option.hook,
          }))

    return (
      <Dialog
        title="Swords of Chaos ⚔️🐉🏆"
        subtitle={
          swordsCreation.mode === 'procedural'
            ? `Choose which life opens its door to ${swordsCreation.name}.`
            : `Choose the life ${swordsCreation.name} is stepping into.`
        }
        onCancel={() => setScreen('swords-character-name')}
      >
        <Box flexDirection="column" gap={1}>
          {swordsCreation.error ? (
            <Text color="error">{swordsCreation.error}</Text>
          ) : null}
          <Text dimColor>
            {swordsCreation.mode === 'procedural'
              ? 'The world heard the name and answered with these possibilities.'
              : 'These premade lives are meant to get you moving fast without feeling borrowed.'}
          </Text>
          <Select
            options={[
              ...options,
              {
                label: 'Choose a different creation path',
                value: 'back',
                description: 'Return to the previous step',
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                setScreen('swords-character-name')
                return
              }
              finalizeSwordsCharacterFromSelection(value)
            }}
            onCancel={() => setScreen('swords-character-name')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-custom-character' && activeCustomField) {
    return (
      <Dialog
        title="Swords of Chaos"
        subtitle={`${activeCustomField.label} · ${swordsCreation.customFieldIndex + 1}/${swordsCustomFields.length}`}
        onCancel={() => {
          if (swordsCreation.customFieldIndex === 0) {
            setScreen('swords-character-name')
            return
          }

          setSwordsCreation(current => ({
            ...current,
            customFieldIndex: current.customFieldIndex - 1,
            error: null,
          }))
        }}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{activeCustomField.prompt}</Text>
          {swordsCreation.error ? (
            <Text color="error">{swordsCreation.error}</Text>
          ) : null}
          <Select
            options={[
              ...activeCustomField.options.map(option => ({
                label: option.label,
                value: option.id,
                description: option.description,
              })),
              {
                label: 'Back up one step',
                value: 'back',
                description: 'Change the previous piece of the sheet',
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                if (swordsCreation.customFieldIndex === 0) {
                  setScreen('swords-character-name')
                  return
                }
                setSwordsCreation(current => ({
                  ...current,
                  customFieldIndex: current.customFieldIndex - 1,
                  error: null,
                }))
                return
              }

              finalizeSwordsCustomCharacterChoice(value)
            }}
            onCancel={() => {
              if (swordsCreation.customFieldIndex === 0) {
                setScreen('swords-character-name')
                return
              }

              setSwordsCreation(current => ({
                ...current,
                customFieldIndex: current.customFieldIndex - 1,
                error: null,
              }))
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-session-zero' && swordsSessionZeroScene) {
    return (
      <Dialog
        title={swordsSessionZeroScene.title}
        subtitle={swordsSessionZeroScene.subtitle}
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{swordsSessionZeroScene.sceneText}</Text>
          {swordsSessionZeroScene.hintText ? (
            <Text dimColor>{swordsSessionZeroScene.hintText}</Text>
          ) : null}
          <Select
            options={[
              ...swordsSessionZeroScene.options.map(option => ({
                label: option.label,
                value: option.id,
                description: option.description,
              })),
              {
                label: 'Back away before this becomes canon',
                value: 'back',
                description: 'Leave the character unbegun and return to the hidden shell',
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                setScreen('menu')
                return
              }

              finishSwordsSessionZero(value)
            }}
            onCancel={() => setScreen('menu')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-free-response') {
    return (
      <Dialog
        title="Swords of Chaos ⚔️🐉🏆"
        subtitle={
          swordsFreeResponse.stage === 'opening'
            ? `Tell the DM what you do in ${swordsEncounterPlace}.`
            : `Tell the DM how you answer the moment in ${swordsEncounterPlace}.`
        }
        onCancel={() => setScreen('swords-of-chaos')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Write the move in your own words. The DM will take the intent
            seriously and answer in-world.
          </Text>
          {swordsFreeResponse.error ? (
            <Text color="error">{swordsFreeResponse.error}</Text>
          ) : null}
          <TextInput
            value={swordsFreeResponse.text}
            onChange={value =>
              setSwordsFreeResponse(current => ({
                ...current,
                text: value,
                cursorOffset: value.length,
                error: null,
              }))
            }
            onSubmit={submitSwordsFreeResponse}
            placeholder="Tell the DM what you do..."
            columns={80}
            cursorOffset={swordsFreeResponse.cursorOffset}
            onChangeCursorOffset={cursorOffset =>
              setSwordsFreeResponse(current => ({
                ...current,
                cursorOffset,
              }))
            }
            focus
            showCursor
          />
          <Text dimColor>Press Enter to commit the move.</Text>
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-dramatic-beat') {
    const fullyRevealed =
      swordsDramaticBeat.revealed >= swordsDramaticBeat.lines.length

    return (
      <Dialog
        title={swordsDramaticBeat.title}
        subtitle={swordsDramaticBeat.subtitle}
        onCancel={() => setScreen('swords-of-chaos')}
      >
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            {swordsDramaticBeat.lines
              .slice(0, swordsDramaticBeat.revealed)
              .map((line, index) => renderBeatLine(line, index))}
          </Box>
          {fullyRevealed ? (
            <Select
              options={[
                {
                  label: 'Continue',
                  value: 'continue',
                  description: 'Follow the scene where it goes next',
                },
              ]}
              onChange={() => continueSwordsDramaticBeat()}
              onCancel={() => continueSwordsDramaticBeat()}
            />
          ) : (
            <Text dimColor>The scene is still arriving…</Text>
          )}
        </Box>
      </Dialog>
    )
  }

  if (screen === 'swords-of-chaos') {
    const openingChoice = swordsEncounter.openingChoice

    if (openingChoice) {
      const secondBeatScene = renderSwordsOfChaosHybridScene({
        stage: 'second-beat',
        openingChoice,
        relevantMemory: swordsRelevantMemory,
      })

      return (
        <Dialog
          title="Swords of Chaos"
          subtitle={secondBeatScene.subtitle}
          onCancel={() => {
            setSwordsEncounter({
              openingChoice: null,
            })
            retreatFromSwordsOfChaos('second-beat', openingChoice)
          }}
        >
          <Box flexDirection="column" gap={1}>
            <Text dimColor>{secondBeatScene.sceneText}</Text>
            {secondBeatScene.hintText ? (
              <Text dimColor>{secondBeatScene.hintText}</Text>
            ) : null}
            <Select
              options={[
                ...secondBeatScene.options,
                {
                  label: 'Make your own move',
                  value: 'free-response',
                  description: 'Answer the scene in your own words',
                },
                {
                  label: `Step back out of ${swordsEncounterPlace}`,
                  value: 'back',
                  description: 'Leave before the place decides for you',
                },
              ]}
              onChange={value => {
                if (value === 'back') {
                  setSwordsEncounter({
                    openingChoice: null,
                  })
                  retreatFromSwordsOfChaos('second-beat', openingChoice)
                  return
                }

                if (value === 'free-response') {
                  beginSwordsFreeResponse('second-beat', openingChoice)
                  return
                }

                beginSwordsDramaticBeat({
                  subtitle: `${getSwordsOpeningLabel(openingChoice)} changes the room.`,
                  script: buildSwordsSecondBeat(
                    value as SwordsOfChaosSecondChoice,
                    swordsEncounterPlace,
                  ),
                  followup: {
                    type: 'result',
                    openingChoice,
                    secondChoice: value as SwordsOfChaosSecondChoice,
                  },
                })
              }}
              onCancel={() => {
                setSwordsEncounter({
                  openingChoice: null,
                })
                retreatFromSwordsOfChaos('second-beat', openingChoice)
              }}
            />
          </Box>
        </Dialog>
      )
    }

    return (
      <Dialog
        title="Swords of Chaos"
        subtitle={swordsOpeningScene.subtitle}
        onCancel={() => retreatFromSwordsOfChaos('opening')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{swordsOpeningScene.sceneText}</Text>
          {swordsOpeningScene.hintText ? (
            <Text dimColor>{swordsOpeningScene.hintText}</Text>
          ) : null}
          <Select
            options={[
              ...swordsOpeningScene.options,
              {
                label: 'Make your own move',
                value: 'free-response',
                description: 'Answer the opening in your own words',
              },
              {
                label: 'Retreat to safer waters',
                value: 'back',
                description: `Leave ${swordsEncounterPlace} before the moment closes around you`,
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                retreatFromSwordsOfChaos('opening')
                return
              }

              if (value === 'free-response') {
                beginSwordsFreeResponse('opening')
                return
              }

              beginSwordsDramaticBeat({
                subtitle: `${getSwordsOpeningLabel(value as SwordsOfChaosOpeningChoice)} begins the trouble.`,
                script: buildSwordsOpeningBeat(
                  value as SwordsOfChaosOpeningChoice,
                  swordsEncounterPlace,
                ),
                followup: {
                  type: 'opening',
                  openingChoice: value as SwordsOfChaosOpeningChoice,
                },
              })
            }}
            onCancel={() => retreatFromSwordsOfChaos('opening')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'archives') {
    return (
      <Dialog
        title="Half-Shell Archives"
        subtitle="The ledger is private, local, and slightly smug about it."
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text>Half-Shell Archives summary for this project:</Text>
          <Text dimColor>- titles: {archiveSummary.titles}</Text>
          <Text dimColor>- inventory: {archiveSummary.inventory}</Text>
          <Text dimColor>- oaths: {archiveSummary.oaths}</Text>
          <Text dimColor>- truths: {archiveSummary.truths}</Text>
          <Text dimColor>- legend events: {archiveSummary.legendEvents}</Text>
          <Text dimColor>- rarity unlocks: {archiveSummary.rarityUnlocks}</Text>
          <Text dimColor>- games played: {archiveSummary.gamesPlayed}</Text>
          <Text dimColor>- wins: {archiveSummary.wins}</Text>
          <Text dimColor>- losses: {archiveSummary.losses}</Text>
          {canonCallback ? <Text dimColor>{canonCallback}</Text> : null}
          <Select
            options={[
              {
                label: 'Return to the hidden shell',
                value: 'menu',
                description: 'Go back to the game menu without muddying the main transcript',
              },
              {
                label: 'Back to work',
                value: 'leave',
                description: 'Close the hidden shell cleanly',
              },
            ]}
            onChange={value => {
              if (value === 'menu') {
                setScreen('menu')
                return
              }

              onExit(undefined, { display: 'skip' })
            }}
            onCancel={() => setScreen('menu')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'result') {
    return (
      <Dialog
        title="Half-Shell Archives"
        subtitle={`${swordsEncounterPlaceLabel} goes quiet again.`}
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{resultMessage ?? 'The shell keeps its own counsel.'}</Text>
          <Select
            options={[
              {
                label: 'Return to the hidden shell',
                value: 'menu',
                description: 'Stay inside the game space and choose another turn',
              },
              {
                label: 'Back to work',
                value: 'leave',
                description: 'Close the game cleanly without adding transcript clutter',
              },
            ]}
            onChange={value => {
              if (value === 'menu') {
                setResultMessage(null)
                setSwordsEncounter({
                  openingChoice: null,
                })
                setScreen('menu')
                return
              }

              onExit(undefined, { display: 'skip' })
            }}
            onCancel={() => setScreen('menu')}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen === 'menu') {
    return (
      <Dialog
        title="Half-Shell Archives"
        subtitle="A hidden SeaTurtle command shell. Quiet, private, and tied to this project."
        onCancel={() => onExit(undefined, { display: 'skip' })}
      >
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text>Project root: {projectRoot}</Text>
            <Text>
              Archives: {archiveSummary.titles} title
              {archiveSummary.titles === 1 ? '' : 's'} · {archiveSummary.inventory}{' '}
              inventory · {archiveSummary.legendEvents} legend event
              {archiveSummary.legendEvents === 1 ? '' : 's'}
            </Text>
            <Text>
              Games: {archiveSummary.gamesPlayed} played · {archiveSummary.wins} win
              {archiveSummary.wins === 1 ? '' : 's'} · {archiveSummary.losses} loss
              {archiveSummary.losses === 1 ? '' : 'es'}
            </Text>
            {canonCallback ? <Text dimColor>{canonCallback}</Text> : null}
          </Box>
          <Select
            options={[
              {
                label: 'Wager with the Mighty SeaTurtle',
                value: 'wager',
                description: gameState.discoveries.wagerPlayed
                  ? 'Return to the first hidden game'
                  : 'The first hidden game waits just under the surface',
              },
              {
                label: 'Roll the Tide Dice',
                value: 'tide-dice',
                description: gameState.discoveries.tideDicePlayed
                  ? 'Return to the second hidden game'
                  : 'A private die waits in the surf',
              },
              {
                label: 'Enter Swords of Chaos',
                value: 'swords-of-chaos',
                description: gameState.discoveries.swordsOfChaosPlayed
                  ? `Return to ${swordsEncounterPlace}`
                  : 'A tiny BBS world waits behind the static',
              },
              {
                label: 'Study the archives',
                value: 'archives',
                description: 'Review the current private archive ledger for this project',
              },
              {
                label: 'Retreat to safer waters',
                value: 'leave',
                description: 'Close the hidden shell and get back to work',
              },
            ]}
            onChange={value => {
              if (value === 'wager') {
                setScreen('wager')
                return
              }

              if (value === 'archives') {
                setScreen('archives')
                return
              }

              if (value === 'tide-dice') {
                setScreen('tide-dice')
                return
              }

              if (value === 'swords-of-chaos') {
                beginSwordsOfChaos()
                return
              }

              onExit(undefined, { display: 'skip' })
            }}
            onCancel={() => onExit(undefined, { display: 'skip' })}
          />
        </Box>
      </Dialog>
    )
  }

  return null
}

export const call: LocalJSXCommandCall = async onDone => {
  markGameCommandDiscovered()
  return <GameCommand onExit={onDone} />
}
