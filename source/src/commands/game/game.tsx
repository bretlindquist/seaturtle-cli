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
  addRarityUnlock,
  updateCtGameState,
} from '../../services/projectIdentity/archives.js'
import {
  getSwordsOfChaosOutcome,
  TIDE_DICE_REWARDS,
  WAGER_REWARDS,
} from '../../services/game/rewards.js'

type OnExit = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type Screen = 'menu' | 'wager' | 'tide-dice' | 'swords-of-chaos'

function GameCommand({ onExit }: { onExit: OnExit }): React.ReactNode {
  const [screen, setScreen] = React.useState<Screen>('menu')
  const projectRoot = getCtProjectRoot()
  const archiveSummary = getCtArchiveSummary(projectRoot)
  const canonCallback = getCtCanonCallback(projectRoot)
  const gameState = readCtGameState(projectRoot)

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
      onExit(
        `You won the wager.\n\nThe Mighty SeaTurtle nods once, as if this outcome was obvious all along.\n\nArchive updates:\n- title: ${WAGER_REWARDS.title}\n- inventory: ${WAGER_REWARDS.inventory}\n- rarity unlock: ${WAGER_REWARDS.rarityUnlock}`,
        { display: 'system' },
      )
      return
    }

    recordCtGameResult('loss', projectRoot)
    addLegendEvent(
      `Lost a wager with the Mighty SeaTurtle after choosing ${choice === 'ride-the-tide' ? 'Ride the Tide' : 'Trust the Shell'}.`,
      projectRoot,
    )
    onExit(
      'You lost the wager.\n\nThe Mighty SeaTurtle says nothing, which somehow makes it worse.\n\nThe loss is recorded in the Half-Shell Archives.',
      { display: 'system' },
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
      onExit(
        `You rolled a ${roll}.\n\nThe tide rises in your favor.\n\nArchive updates:\n- inventory: ${TIDE_DICE_REWARDS.inventory}\n- rarity unlock: ${TIDE_DICE_REWARDS.rarityUnlock}`,
        { display: 'system' },
      )
      return
    }

    if (roll >= 4) {
      recordCtGameResult('played', projectRoot)
      addLegendEvent(`Rolled a steady ${roll} in Roll the Tide Dice.`, projectRoot)
      onExit(
        `You rolled a ${roll}.\n\nNot a triumph. Not a disaster. The tide simply acknowledges you and moves on.`,
        { display: 'system' },
      )
      return
    }

    recordCtGameResult('loss', projectRoot)
    addLegendEvent(`Rolled a rough ${roll} in Roll the Tide Dice.`, projectRoot)
    onExit(
      `You rolled a ${roll}.\n\nThe tide takes this round without apology.\n\nThe loss is recorded in the Half-Shell Archives.`,
      { display: 'system' },
    )
  }

  function finishSwordsOfChaos(choice: 'draw-steel' | 'bow-slightly'): void {
    const outcome = getSwordsOfChaosOutcome(Math.floor(Math.random() * 4))

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

    if (outcome.key === 'relic') {
      recordCtGameResult('win', projectRoot)
      addInventoryItem(outcome.inventory, projectRoot)
      addLegendEvent(
        `Survived Swords of Chaos after choosing ${choice === 'draw-steel' ? 'Draw Steel' : 'Bow Slightly'} and came away with a ${outcome.inventory}.`,
        projectRoot,
      )
      onExit(
        `Swords of Chaos ends with a strange little victory.\n\nA turtle in a trench coat vanishes into the dark and leaves behind a ${outcome.inventory}.\n\nThe relic is now in the Half-Shell Archives.`,
        { display: 'system' },
      )
      return
    }

    if (outcome.key === 'title') {
      recordCtGameResult('win', projectRoot)
      addTitle(outcome.title, projectRoot)
      addLegendEvent(
        `Won a title in Swords of Chaos after choosing ${choice === 'draw-steel' ? 'Draw Steel' : 'Bow Slightly'}.`,
        projectRoot,
      )
      onExit(
        `Swords of Chaos closes with an old arcade hush.\n\nThe trench-coat turtle names you ${outcome.title}, then disappears.\n\nThe title is now in the Half-Shell Archives.`,
        { display: 'system' },
      )
      return
    }

    if (outcome.key === 'oath') {
      recordCtGameResult('played', projectRoot)
      addOath(outcome.oath, projectRoot)
      addLegendEvent(
        `Accepted an oath in Swords of Chaos after choosing ${choice === 'draw-steel' ? 'Draw Steel' : 'Bow Slightly'}.`,
        projectRoot,
      )
      onExit(
        `Swords of Chaos does not give you a prize this time.\n\nInstead, the trench-coat turtle leaves you with an oath: "${outcome.oath}"\n\nThe oath is now in the Half-Shell Archives.`,
        { display: 'system' },
      )
      return
    }

    recordCtGameResult('loss', projectRoot)
    addLegendEvent(
      `Was turned away from Swords of Chaos after choosing ${choice === 'draw-steel' ? 'Draw Steel' : 'Bow Slightly'}.`,
      projectRoot,
    )
    onExit(
      'Swords of Chaos snaps shut before it really begins.\n\nThe trench-coat turtle tilts its head, decides you are not ready, and the alley goes dark.\n\nThe refusal is recorded in the Half-Shell Archives.',
      { display: 'system' },
    )
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
    return (
      <Dialog
        title="Swords of Chaos"
        subtitle="A short BBS alleyway. A trench-coat turtle. A bad decision waiting to happen."
        onCancel={() => setScreen('menu')}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Neon rain. A humming sign. A trench-coat turtle under one broken
            lamp.
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

              finishSwordsOfChaos(value as 'draw-steel' | 'bow-slightly')
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
        onCancel={() => onExit('The Half-Shell Archives slip back beneath the surface.', { display: 'system' })}
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
                onExit(
                  `Half-Shell Archives summary for this project:\n- titles: ${archiveSummary.titles}\n- inventory: ${archiveSummary.inventory}\n- oaths: ${archiveSummary.oaths}\n- truths: ${archiveSummary.truths}\n- legend events: ${archiveSummary.legendEvents}\n- rarity unlocks: ${archiveSummary.rarityUnlocks}\n- games played: ${archiveSummary.gamesPlayed}\n- wins: ${archiveSummary.wins}\n- losses: ${archiveSummary.losses}`,
                  { display: 'system' },
                )
                return
              }

              if (value === 'tide-dice') {
                setScreen('tide-dice')
                return
              }

              if (value === 'swords-of-chaos') {
                setScreen('swords-of-chaos')
                return
              }

              onExit('The Half-Shell Archives slip back beneath the surface.', {
                display: 'system',
              })
            }}
            onCancel={() =>
              onExit('The Half-Shell Archives slip back beneath the surface.', {
                display: 'system',
              })
            }
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
