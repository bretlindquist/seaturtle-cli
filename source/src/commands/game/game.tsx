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
} from '../../services/projectIdentity/archives.js'

type OnExit = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type Screen = 'menu'

function GameCommand({ onExit }: { onExit: OnExit }): React.ReactNode {
  const [screen] = React.useState<Screen>('menu')
  const projectRoot = getCtProjectRoot()
  const archiveSummary = getCtArchiveSummary(projectRoot)
  const canonCallback = getCtCanonCallback(projectRoot)
  const gameState = readCtGameState(projectRoot)

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
                  ? 'Return to the first hidden game when it is fully awakened'
                  : 'The first hidden game stirs here next',
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
                onExit(
                  'The table is not fully set yet, but the Mighty SeaTurtle is awake now.\n\nNext: this hidden shell is live; the wager itself lands in the next chunk.',
                  { display: 'system' },
                )
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
