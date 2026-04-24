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
  consumeSwordsPendingSeaTurtleOpening,
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
  maybeBuildSwordsDealerChoiceBeat,
  maybeBuildSwordsSceneStateBeat,
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
  type SwordsDramaticBeatSegment,
  type SwordsDramaticBeatScript,
  type SwordsOfChaosCreationMode,
  type SwordsOfChaosOpeningChoice,
  type SwordsOfChaosSecondChoice,
  type SwordsOfChaosDmSceneResponse,
  type SwordsOfChaosRelevantMemory,
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
  queuedBeats: SwordsDramaticBeatSegment[]
  followup:
    | {
        type: 'opening'
        openingChoice: SwordsOfChaosOpeningChoice
      }
    | {
        type: 'return-to-second-beat'
      }
    | {
        type: 'result'
        openingChoice: SwordsOfChaosOpeningChoice
        secondChoice: SwordsOfChaosSecondChoice
      }
    | null
}

type SwordsSceneRevealState = {
  key: string
  revealed: number
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

function getSwordsJourneyPanelLines(
  relevantMemory: SwordsOfChaosRelevantMemory,
): string[] {
  const lines: string[] = []
  const development = relevantMemory.characterDevelopment
  const magicState = relevantMemory.magicState

  if (development?.title) {
    lines.push(`Arc: ${development.title} · stage ${development.stage}`)
  }

  if (relevantMemory.chapterTitle) {
    const chapterLine = relevantMemory.currentObjective
      ? `${relevantMemory.chapterTitle} · ${relevantMemory.currentObjective}`
      : relevantMemory.chapterTitle
    lines.push(`Chapter: ${chapterLine}`)
  } else if (relevantMemory.currentObjective) {
    lines.push(`Objective: ${relevantMemory.currentObjective}`)
  }

  if (development?.lesson) {
    lines.push(`Lesson: ${development.lesson}`)
  } else if (development?.pressure) {
    lines.push(`Pressure: ${development.pressure}`)
  }

  if (magicState && magicState.activeImpossible !== 'none') {
    const magicLine =
      magicState.lastOmen ??
      (magicState.activeImpossible === 'crossing'
        ? 'A crossing is active around you.'
        : magicState.activeImpossible === 'witness'
          ? 'An impossible witness is active around you.'
          : magicState.activeImpossible === 'relic-sign'
            ? 'The uncanny is behaving like evidence around you now.'
            : 'A quiet omen is moving around you now.')
    lines.push(`Uncanny: ${magicLine}`)
  }

  if (relevantMemory.carryForward) {
    lines.push(`Aftermath: ${relevantMemory.carryForward}`)
  }

  if (relevantMemory.currentObjective || relevantMemory.storyTension !== 'low') {
    const pressureLead =
      relevantMemory.storyTension === 'high'
        ? 'Heat is climbing'
        : relevantMemory.storyTension === 'rising'
          ? 'The thread is carrying forward'
          : 'The next step is live'
    lines.push(
      `Coming next: ${pressureLead}${relevantMemory.currentObjective ? ` · ${relevantMemory.currentObjective}` : ''}`,
    )
  }

  return lines.slice(0, 4)
}

function renderSwordsJourneyPanel(
  relevantMemory: SwordsOfChaosRelevantMemory,
): React.ReactNode {
  const lines = getSwordsJourneyPanelLines(relevantMemory)
  if (lines.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>What the journey knows about you:</Text>
      {lines.map(line => (
        <Text key={line} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  )
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
      queuedBeats: [],
      followup: null,
    })
  const [swordsSceneReveal, setSwordsSceneReveal] =
    React.useState<SwordsSceneRevealState>({
      key: '',
      revealed: 0,
    })
  const [swordsSceneGateSeenKey, setSwordsSceneGateSeenKey] =
    React.useState<string | null>(null)
  const projectRoot = getCtProjectRoot()
  const archiveSummary = getCtArchiveSummary(projectRoot)
  const canonCallback = getCtCanonCallback(projectRoot)
  const gameState = readCtGameState(projectRoot)
  const [swordsRuntimeSave, setSwordsRuntimeSave] = React.useState(() =>
    ensureSwordsOfChaosRuntimeReady(),
  )
  const [swordsOpeningMemorySnapshot, setSwordsOpeningMemorySnapshot] =
    React.useState<SwordsOfChaosRelevantMemory | null>(null)
  const swordsRelevantMemory = React.useMemo(
    () => getSwordsOfChaosRelevantMemory(swordsRuntimeSave),
    [swordsRuntimeSave],
  )
  const swordsOpeningMemory = swordsOpeningMemorySnapshot ?? swordsRelevantMemory
  const swordsOpeningScene = React.useMemo<SwordsOfChaosDmSceneResponse>(
    () =>
      renderSwordsOfChaosHybridScene({
        stage: 'opening',
        relevantMemory: swordsOpeningMemory,
      }),
    [swordsOpeningMemory],
  )
  const swordsSecondBeatScene = React.useMemo<SwordsOfChaosDmSceneResponse | null>(
    () =>
      swordsEncounter.openingChoice
        ? renderSwordsOfChaosHybridScene({
            stage: 'second-beat',
            openingChoice: swordsEncounter.openingChoice,
            relevantMemory: swordsRelevantMemory,
          })
        : null,
    [swordsEncounter.openingChoice, swordsRelevantMemory],
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
    true,
  )

  const activeSwordsScene =
    screen === 'swords-of-chaos'
      ? swordsSecondBeatScene ?? swordsOpeningScene
      : null
  const activeSwordsSceneParagraphs = React.useMemo(
    () =>
      activeSwordsScene
        ? activeSwordsScene.sceneText.split('\n\n').filter(Boolean)
        : [],
    [activeSwordsScene],
  )
  const activeSwordsSceneKey =
    activeSwordsScene
      ? `${swordsEncounterLocus}:${swordsEncounter.openingChoice ?? 'opening'}:${activeSwordsScene.subtitle}:${activeSwordsScene.sceneText}`
      : ''
  const swordsSceneGateKey =
    swordsEncounter.openingChoice && swordsRelevantMemory.sceneState
      ? `${swordsEncounter.openingChoice}:${swordsRelevantMemory.sceneState.kind}:${swordsRelevantMemory.sceneState.status}:${swordsRelevantMemory.sceneState.pendingReveal}`
      : null

  React.useEffect(() => {
    if (!activeSwordsScene || !activeSwordsSceneKey) {
      return
    }

    setSwordsSceneReveal(current =>
      current.key === activeSwordsSceneKey
        ? current
        : {
            key: activeSwordsSceneKey,
            revealed: 0,
          },
    )
  }, [activeSwordsScene, activeSwordsSceneKey])

  useInterval(
    () => {
      setSwordsSceneReveal(current => ({
        ...current,
        revealed: Math.min(
          current.revealed + 1,
          activeSwordsSceneParagraphs.length,
        ),
      }))
    },
    screen === 'swords-of-chaos' &&
      activeSwordsSceneParagraphs.length > 0 &&
      swordsSceneReveal.key === activeSwordsSceneKey &&
      swordsSceneReveal.revealed < activeSwordsSceneParagraphs.length
      ? 260
      : null,
    true,
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
    queuedBeats?: SwordsDramaticBeatSegment[]
    followup: SwordsDramaticBeatState['followup']
  }): void {
    setSwordsDramaticBeat({
      title: 'Swords of Chaos ⚔️🐉🏆',
      subtitle: input.subtitle,
      focus: input.script.focus,
      lines: input.script.lines,
      revealed: 0,
      queuedBeats: input.queuedBeats ?? [],
      followup: input.followup,
    })
    setScreen('swords-dramatic-beat')
  }

  function continueSwordsDramaticBeat(): void {
    if (swordsDramaticBeat.queuedBeats.length > 0) {
      const [nextBeat, ...remainingBeats] = swordsDramaticBeat.queuedBeats
      setSwordsDramaticBeat(current => ({
        ...current,
        subtitle: nextBeat?.subtitle ?? current.subtitle,
        focus: nextBeat?.script.focus ?? current.focus,
        lines: nextBeat?.script.lines ?? current.lines,
        revealed: 0,
        queuedBeats: remainingBeats,
      }))
      return
    }

    if (!swordsDramaticBeat.followup) {
      setScreen('swords-of-chaos')
      return
    }

    if (swordsDramaticBeat.followup.type === 'opening') {
      setSwordsSceneGateSeenKey(null)
      setSwordsEncounter({
        openingChoice: swordsDramaticBeat.followup.openingChoice,
      })
      setScreen('swords-of-chaos')
      return
    }

    if (swordsDramaticBeat.followup.type === 'return-to-second-beat') {
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
    setSwordsSceneGateSeenKey(null)

    if (swordsNeedsCreation) {
      resetSwordsCreationState()
      setScreen('swords-character-intro')
      return
    }

    if (swordsNeedsPrelude) {
      setScreen('swords-session-zero')
      return
    }

    setSwordsOpeningMemorySnapshot(swordsRelevantMemory)
    if (swordsRelevantMemory.seaturtleOpeningPending) {
      setSwordsRuntimeSave(current =>
        consumeSwordsPendingSeaTurtleOpening(current),
      )
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
    setSwordsOpeningMemorySnapshot(null)
    setSwordsSceneGateSeenKey(null)
    const resolution = resolveSwordsOfChaosRoute(openingChoice, secondChoice, {
      encounterLocus: getSwordsEncounterLocus(swordsRelevantMemory),
      character: swordsRuntimeSave.character,
      currentDevelopment: swordsRuntimeSave.characterDevelopment,
      currentMagic: swordsRuntimeSave.magic,
      currentChapter: swordsRelevantMemory.storyChapter,
      previousObjective: swordsRelevantMemory.currentObjective,
      relevantMemory: swordsRelevantMemory,
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
    setSwordsOpeningMemorySnapshot(null)
    setSwordsSceneGateSeenKey(null)
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
      const secondBeatScene = swordsSecondBeatScene
      if (!secondBeatScene) {
        return null
      }
      const secondBeatFullyRevealed =
        swordsSceneReveal.key === activeSwordsSceneKey &&
        swordsSceneReveal.revealed >= activeSwordsSceneParagraphs.length
      const secondBeatNeedsContinuationGate =
        secondBeatFullyRevealed &&
        !!swordsSceneGateKey &&
        swordsSceneGateSeenKey !== swordsSceneGateKey

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
            <Box flexDirection="column">
              {activeSwordsSceneParagraphs
                .slice(0, swordsSceneReveal.revealed)
                .map((paragraph, index) => (
                  <Text key={`${activeSwordsSceneKey}-${index}`} dimColor>
                    {paragraph}
                  </Text>
                ))}
            </Box>
            {secondBeatFullyRevealed
              ? renderSwordsJourneyPanel(swordsRelevantMemory)
              : null}
            {secondBeatFullyRevealed &&
            !secondBeatNeedsContinuationGate &&
            secondBeatScene.hintText ? (
              <Text dimColor>{secondBeatScene.hintText}</Text>
            ) : null}
            {secondBeatNeedsContinuationGate ? (
              <Select
                options={[
                  {
                    label: 'Continue the committed scene',
                    value: 'continue-scene',
                    description:
                      'Let the consequence already in motion unfold before choosing again',
                  },
                ]}
                onChange={() => {
                  setSwordsSceneGateSeenKey(swordsSceneGateKey)
                  const sceneStateBeat = maybeBuildSwordsSceneStateBeat({
                    openingChoice,
                    relevantMemory: swordsRelevantMemory,
                  })

                  if (!sceneStateBeat) {
                    return
                  }

                  const [firstBeat, ...queuedBeats] = sceneStateBeat.beats
                  if (!firstBeat) {
                    return
                  }

                  beginSwordsDramaticBeat({
                    subtitle: firstBeat.subtitle,
                    script: firstBeat.script,
                    queuedBeats,
                    followup: {
                      type: 'return-to-second-beat',
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
            ) : secondBeatFullyRevealed ? (
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

                  const dealerChoiceBeat = maybeBuildSwordsDealerChoiceBeat({
                    stage: 'second-beat',
                    openingChoice,
                    secondChoice: value as SwordsOfChaosSecondChoice,
                    relevantMemory: swordsRelevantMemory,
                  })

                if (dealerChoiceBeat) {
                  setSwordsSceneGateSeenKey(null)
                  const [firstBeat, ...queuedBeats] = dealerChoiceBeat.beats
                  if (!firstBeat) {
                    return
                  }
                  beginSwordsDramaticBeat({
                    subtitle: firstBeat.subtitle,
                    script: firstBeat.script,
                    queuedBeats,
                    followup: {
                      type: 'result',
                      openingChoice,
                        secondChoice: value as SwordsOfChaosSecondChoice,
                      },
                    })
                    return
                  }

                  finishSwordsOfChaos(
                    openingChoice,
                    value as SwordsOfChaosSecondChoice,
                  )
                }}
                onCancel={() => {
                  setSwordsEncounter({
                    openingChoice: null,
                  })
                  retreatFromSwordsOfChaos('second-beat', openingChoice)
                }}
              />
            ) : (
              <Text dimColor>The scene is still arriving…</Text>
            )}
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
          <Box flexDirection="column">
            {activeSwordsSceneParagraphs
              .slice(0, swordsSceneReveal.revealed)
              .map((paragraph, index) => (
                <Text key={`${activeSwordsSceneKey}-${index}`} dimColor>
                  {paragraph}
                </Text>
              ))}
          </Box>
          {swordsSceneReveal.key === activeSwordsSceneKey &&
          swordsSceneReveal.revealed >= activeSwordsSceneParagraphs.length
            ? renderSwordsJourneyPanel(swordsOpeningMemory)
            : null}
          {swordsSceneReveal.key === activeSwordsSceneKey &&
          swordsSceneReveal.revealed >= activeSwordsSceneParagraphs.length &&
          swordsOpeningScene.hintText ? (
            <Text dimColor>{swordsOpeningScene.hintText}</Text>
          ) : null}
          {swordsSceneReveal.key === activeSwordsSceneKey &&
          swordsSceneReveal.revealed >= activeSwordsSceneParagraphs.length ? (
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

                const dealerChoiceBeat = maybeBuildSwordsDealerChoiceBeat({
                  stage: 'opening',
                  openingChoice: value as SwordsOfChaosOpeningChoice,
                  relevantMemory: swordsRelevantMemory,
                })

                if (dealerChoiceBeat) {
                  const [firstBeat, ...queuedBeats] = dealerChoiceBeat.beats
                  if (!firstBeat) {
                    return
                  }
                  beginSwordsDramaticBeat({
                    subtitle: firstBeat.subtitle,
                    script: firstBeat.script,
                    queuedBeats,
                    followup: {
                      type: 'opening',
                      openingChoice: value as SwordsOfChaosOpeningChoice,
                    },
                  })
                  return
                }

                setSwordsEncounter({
                  openingChoice: value as SwordsOfChaosOpeningChoice,
                })
                setSwordsSceneGateSeenKey(null)
              }}
              onCancel={() => retreatFromSwordsOfChaos('opening')}
            />
          ) : (
            <Text dimColor>The scene is still arriving…</Text>
          )}
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
          {renderSwordsJourneyPanel(swordsRelevantMemory)}
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
