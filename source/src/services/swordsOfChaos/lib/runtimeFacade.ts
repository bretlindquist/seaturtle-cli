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

export function ensureSwordsOfChaosRuntimeReady(): SwordsOfChaosSaveFile {
  const save = ensureSwordsOfChaosSaveExists()
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
