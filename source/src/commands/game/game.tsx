import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Box, Text } from '../../ink.js'
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
  getSwordsOfChaosOutcome,
  type SwordsOfChaosOpeningChoice,
  type SwordsOfChaosRoute,
  type SwordsOfChaosSecondChoice,
  TIDE_DICE_REWARDS,
  WAGER_REWARDS,
} from '../../services/game/rewards.js'
import {
  applySwordsOfChaosOutcomeEchoes,
  ensureSwordsOfChaosRuntimeReady,
  touchSwordsOfChaosSave,
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
  | 'swords-of-chaos'
  | 'archives'
  | 'result'

type SwordsEncounter = {
  openingChoice: SwordsOfChaosOpeningChoice | null
}

type SwordsSecondBeatOption = {
  label: string
  value: SwordsOfChaosSecondChoice
  description: string
}

function getSwordsOpeningLabel(choice: SwordsOfChaosOpeningChoice): string {
  switch (choice) {
    case 'draw-steel':
      return 'Draw Steel'
    case 'bow-slightly':
      return 'Bow Slightly'
    case 'talk-like-you-belong':
      return "Talk Like You've Been Here Before"
  }
}

function getSwordsSecondBeat(
  choice: SwordsOfChaosOpeningChoice,
): {
  subtitle: string
  intro: string
  options: SwordsSecondBeatOption[]
} {
  switch (choice) {
    case 'draw-steel':
      return {
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
      }
    case 'bow-slightly':
      return {
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
      }
    case 'talk-like-you-belong':
      return {
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
      }
  }
}

function GameCommand({ onExit }: { onExit: OnExit }): React.ReactNode {
  const [screen, setScreen] = React.useState<Screen>('menu')
  const [swordsEncounter, setSwordsEncounter] = React.useState<SwordsEncounter>({
    openingChoice: null,
  })
  const [resultMessage, setResultMessage] = React.useState<string | null>(null)
  const projectRoot = getCtProjectRoot()
  const archiveSummary = getCtArchiveSummary(projectRoot)
  const canonCallback = getCtCanonCallback(projectRoot)
  const gameState = readCtGameState(projectRoot)

  React.useEffect(() => {
    ensureSwordsOfChaosRuntimeReady()
  }, [])

  function showResult(result: string): void {
    setResultMessage(result)
    setScreen('result')
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
    const route = `${openingChoice}:${secondChoice}` as SwordsOfChaosRoute
    const outcome = getSwordsOfChaosOutcome(route)

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
    touchSwordsOfChaosSave(current => ({
      ...current,
      runHistorySummary: {
        ...current.runHistorySummary,
        runsStarted: Math.max(current.runHistorySummary.runsStarted, 1),
        lastPlayedAt: Date.now(),
      },
    }))

    recordCtGameResult(outcome.gameResult, projectRoot)

    if (outcome.key === 'relic') {
      applySwordsOfChaosOutcomeEchoes(
        [
          { kind: 'legend', value: outcome.legendEvent },
          { kind: 'relic', value: outcome.inventory },
        ],
        projectRoot,
      )
      if (outcome.rarityUnlock) {
        addRarityUnlock(outcome.rarityUnlock, projectRoot)
      }
      showResult(outcome.ending)
      return
    }

    if (outcome.key === 'title') {
      applySwordsOfChaosOutcomeEchoes(
        [
          { kind: 'legend', value: outcome.legendEvent },
          { kind: 'title', value: outcome.title },
        ],
        projectRoot,
      )
      showResult(outcome.ending)
      return
    }

    if (outcome.key === 'oath') {
      applySwordsOfChaosOutcomeEchoes(
        [
          { kind: 'legend', value: outcome.legendEvent },
          { kind: 'oath', value: outcome.oath },
        ],
        projectRoot,
      )
      showResult(outcome.ending)
      return
    }

    if (outcome.key === 'truth') {
      applySwordsOfChaosOutcomeEchoes(
        [
          { kind: 'legend', value: outcome.legendEvent },
          { kind: 'truth', value: outcome.truth },
        ],
        projectRoot,
      )
      showResult(outcome.ending)
      return
    }

    applySwordsOfChaosOutcomeEchoes(
      [{ kind: 'legend', value: outcome.legendEvent }],
      projectRoot,
    )
    showResult(outcome.ending)
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

  if (screen === 'swords-of-chaos') {
    const openingChoice = swordsEncounter.openingChoice

    if (openingChoice) {
      const secondBeat = getSwordsSecondBeat(openingChoice)

      return (
        <Dialog
          title="Swords of Chaos"
          subtitle={secondBeat.subtitle}
          onCancel={() =>
            setSwordsEncounter({
              openingChoice: null,
            })
          }
        >
          <Box flexDirection="column" gap={1}>
            <Text dimColor>
              {getSwordsOpeningLabel(openingChoice)} got you this far. The
              alley seems interested now.
            </Text>
            <Text dimColor>{secondBeat.intro}</Text>
            <Select
              options={[
                ...secondBeat.options,
                {
                  label: 'Step back out of the alley',
                  value: 'back',
                  description: 'Leave before the sign decides for you',
                },
              ]}
              onChange={value => {
                if (value === 'back') {
                  setSwordsEncounter({
                    openingChoice: null,
                  })
                  return
                }

                finishSwordsOfChaos(
                  openingChoice,
                  value as SwordsOfChaosSecondChoice,
                )
              }}
              onCancel={() =>
                setSwordsEncounter({
                  openingChoice: null,
                })
              }
            />
          </Box>
        </Dialog>
      )
    }

    return (
      <Dialog
        title="Swords of Chaos"
        subtitle="A short BBS alleyway. A trench-coat turtle. Three different ways to make the night interesting."
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Neon rain. A humming sign. A trench-coat turtle under one broken
            lamp.
          </Text>
          <Text dimColor>
            The first move matters here. Pick the posture that feels most like
            trouble you can survive.
          </Text>
          <Select
            options={[
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
                description: 'Bluff familiarity and let the alley decide whether to believe you',
              },
              {
                label: 'Retreat to safer waters',
                value: 'back',
                description: 'Leave the alley before the sign flickers again',
              },
            ]}
            onChange={value => {
              if (value === 'back') {
                setScreen('menu')
                return
              }

              setSwordsEncounter({
                openingChoice: value as SwordsOfChaosOpeningChoice,
              })
            }}
            onCancel={() => setScreen('menu')}
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
        subtitle="The alley goes quiet again."
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
                  ? 'Return to the trench-coat turtle alley'
                  : 'A tiny BBS alley waits behind the static',
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
                setSwordsEncounter({
                  openingChoice: null,
                })
                setScreen('swords-of-chaos')
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
