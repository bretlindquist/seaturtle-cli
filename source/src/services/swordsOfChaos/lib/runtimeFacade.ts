import type { SwordsOfChaosHostEcho } from '../types/echoes.js'
import type { SwordsOfChaosEventBatch } from '../types/events.js'
import type {
  SwordsCharacterCustomField,
  SwordsCharacterProceduralOption,
} from '../types/character.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { applySwordsOfChaosHostEchoes } from './archiveEchoBridge.js'
import {
  buildSwordsCharacterSheetFromCustomChoices,
  buildSwordsCharacterSheetFromPremade,
  buildSwordsCharacterSheetFromProcedural,
  buildSwordsProceduralCharacterChoices,
  getSwordsCharacterCreationModes,
  getSwordsCharacterSheetSeed,
  getSwordsCustomCharacterFields as getSwordsCustomCharacterFieldDefinitions,
  getSwordsPremadeArchetypes,
} from './characterCreation.js'
import { appendSwordsOfChaosEvent } from './eventHistory.js'
import { processSwordsOfChaosEventBatch } from './eventProcessor.js'
import {
  ensureSwordsOfChaosSaveExists,
  saveSwordsOfChaosSave,
} from './saveManager.js'
import { buildSwordsSessionZeroScene, getSwordsSessionZeroPrelude } from './sessionZero.js'

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

export function swordsNeedsCharacterCreation(
  save: SwordsOfChaosSaveFile,
): boolean {
  return !save.character.name
}

export function swordsNeedsSessionZero(save: SwordsOfChaosSaveFile): boolean {
  return !!save.character.name && !save.sessionZero.completed
}

export function getSwordsCharacterCreationOptions() {
  return getSwordsCharacterCreationModes()
}

export function getSwordsPremadeCharacterOptions() {
  return getSwordsPremadeArchetypes()
}

export function getSwordsCustomCharacterFields() {
  return getSwordsCustomCharacterFieldDefinitions()
}

export function buildSwordsProceduralOptions(name: string) {
  return buildSwordsProceduralCharacterChoices(
    getSwordsCharacterSheetSeed('procedural', name),
  )
}

export function finalizeSwordsPremadeCharacter(
  name: string,
  archetypeId: string,
): SwordsOfChaosSaveFile {
  const current = ensureSwordsOfChaosSaveExists()
  const next = saveSwordsOfChaosSave({
    ...current,
    character: buildSwordsCharacterSheetFromPremade(name, archetypeId),
  })
  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'character_created',
    detail: {
      mode: 'premade',
      name: next.character.name,
      archetype: next.character.archetype,
    },
  })
  return next
}

export function finalizeSwordsProceduralCharacter(
  name: string,
  option: SwordsCharacterProceduralOption,
): SwordsOfChaosSaveFile {
  const current = ensureSwordsOfChaosSaveExists()
  const next = saveSwordsOfChaosSave({
    ...current,
    character: buildSwordsCharacterSheetFromProcedural(name, option),
  })
  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'character_created',
    detail: {
      mode: 'procedural',
      name: next.character.name,
      archetype: option.label,
    },
  })
  return next
}

export function finalizeSwordsCustomCharacter(
  name: string,
  choices: Record<SwordsCharacterCustomField, string>,
): SwordsOfChaosSaveFile {
  const current = ensureSwordsOfChaosSaveExists()
  const next = saveSwordsOfChaosSave({
    ...current,
    character: buildSwordsCharacterSheetFromCustomChoices(name, choices),
  })
  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'character_created',
    detail: {
      mode: 'custom',
      name: next.character.name,
      archetype: next.character.className,
    },
  })
  return next
}

export function getSwordsSessionZeroPreludeCopy() {
  return getSwordsSessionZeroPrelude()
}

export function getSwordsSessionZeroScene(save: SwordsOfChaosSaveFile) {
  return buildSwordsSessionZeroScene({
    character: save.character,
    seed: `${save.character.name ?? 'nameless'}:${save.character.origin ?? 'unknown'}:${save.character.className ?? 'wanderer'}`,
  })
}

export function completeSwordsSessionZero(
  save: SwordsOfChaosSaveFile,
  choiceId: string,
): SwordsOfChaosSaveFile {
  const scene = getSwordsSessionZeroScene(save)
  const next = saveSwordsOfChaosSave({
    ...save,
    seaturtle:
      scene.firstContact === 'measured-wink' && choiceId === 'follow-the-stranger'
        ? {
            bond: save.seaturtle.bond + 1,
            favor: save.seaturtle.favor,
            appearances: Math.max(save.seaturtle.appearances, 1),
            lastAppearanceAt: Date.now(),
          }
        : save.seaturtle,
    sessionZero: {
      completed: true,
      originPlace: scene.originPlace,
      firstContact: scene.firstContact,
      completedAt: Date.now(),
    },
  })
  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'session_zero_completed',
    detail: {
      name: next.character.name,
      originPlace: next.sessionZero.originPlace,
      firstContact: next.sessionZero.firstContact,
      choiceId,
      seaturtleBond: next.seaturtle.bond,
    },
  })
  return next
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
