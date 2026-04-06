import type { SwordsOfChaosHostEcho } from '../types/echoes.js'
import type { SwordsOfChaosEventBatch } from '../types/events.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { applySwordsOfChaosHostEchoes } from './archiveEchoBridge.js'
import { appendSwordsOfChaosEvent } from './eventHistory.js'
import { processSwordsOfChaosEventBatch } from './eventProcessor.js'
import {
  ensureSwordsOfChaosSaveExists,
  saveSwordsOfChaosSave,
} from './saveManager.js'

function shouldTriggerSeaTurtleGlimpse(save: SwordsOfChaosSaveFile): boolean {
  if (save.seaturtle.appearances > 0) {
    return false
  }

  const alleyVisits =
    save.encounterMemory['trench-coat-turtle-alley']?.visits ?? 0
  const hasCanonThread = Object.values(save.threadMemory).some(
    thread => thread.canonized,
  )

  return alleyVisits >= 3 && hasCanonThread
}

export function ensureSwordsOfChaosRuntimeReady(): SwordsOfChaosSaveFile {
  let save = ensureSwordsOfChaosSaveExists()

  if (shouldTriggerSeaTurtleGlimpse(save)) {
    save = saveSwordsOfChaosSave(
      processSwordsOfChaosEventBatch(save, {
        at: Date.now(),
        events: [
          {
            kind: 'seaturtle_glimpse_record',
            seenAt: Date.now(),
          },
          {
            kind: 'world_flag_add',
            flag: 'seaturtle:glimpsed-in-swords-of-chaos',
          },
        ],
      }),
    )
    appendSwordsOfChaosEvent({
      at: Date.now(),
      kind: 'seaturtle_glimpsed',
      detail: {
        bond: save.seaturtle.bond,
        appearances: save.seaturtle.appearances,
      },
    })
  }

  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'game_opened',
    detail: {
      level: save.player.level,
      titles: save.progression.titles.length,
    },
  })
  return save
}

export function applySwordsOfChaosOutcomeEchoes(
  echoes: SwordsOfChaosHostEcho[],
  root?: string,
): void {
  if (echoes.length === 0) {
    return
  }

  applySwordsOfChaosHostEchoes(echoes, root)
  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'host_echo_applied',
    detail: {
      count: echoes.length,
      kinds: echoes.map(echo => echo.kind),
    },
  })
}

export function applySwordsOfChaosEventBatchToSave(
  batch: SwordsOfChaosEventBatch,
): SwordsOfChaosSaveFile {
  const current = ensureSwordsOfChaosSaveExists()
  const next = processSwordsOfChaosEventBatch(current, batch)
  const saved = saveSwordsOfChaosSave(next)
  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'outcome_recorded',
    detail: {
      level: saved.player.level,
      titles: saved.progression.titles.length,
      inventory: saved.inventory.length,
    },
  })
  return saved
}
