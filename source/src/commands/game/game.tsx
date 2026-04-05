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
  addRarityUnlock,
  updateCtGameState,
} from '../../services/projectIdentity/archives.js'

type OnExit = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type Screen = 'menu' | 'wager'

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
      addInventoryItem('shell-marked lucky token', projectRoot)
      addRarityUnlock('wager-with-the-mighty-seaturtle', projectRoot)
      addTitle('Friend of the Mighty SeaTurtle', projectRoot)
      onExit(
        `You won the wager.\n\nThe Mighty SeaTurtle nods once, as if this outcome was obvious all along.\n\nArchive updates:\n- title: Friend of the Mighty SeaTurtle\n- inventory: shell-marked lucky token\n- rarity unlock: wager-with-the-mighty-seaturtle`,
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
