import type { SwordsOfChaosHostEcho } from '../types/echoes.js'
import type { SwordsOfChaosEventBatch } from '../types/events.js'
import type {
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosRoute,
  SwordsOfChaosSecondChoice,
} from '../types/outcomes.js'
import type { SwordsOfChaosResolution } from '../types/resolution.js'
import { getSwordsOfChaosOutcome } from './outcomes.js'

function getOutcomeThread(route: SwordsOfChaosRoute): string {
  const outcome = getSwordsOfChaosOutcome(route)

  switch (outcome.key) {
    case 'relic':
      return 'half-shell-relic-trail'
    case 'title':
      return 'broken-lamp-witnesses'
    case 'oath':
      return 'alley-oath-keepers'
    case 'truth':
      return 'sign-truth-fractures'
    case 'refusal':
      return 'quiet-refusals'
  }
}

function buildHostEchoes(route: SwordsOfChaosRoute): SwordsOfChaosHostEcho[] {
  const outcome = getSwordsOfChaosOutcome(route)
  const echoes: SwordsOfChaosHostEcho[] = [
    { kind: 'legend', value: outcome.legendEvent },
  ]

  switch (outcome.key) {
    case 'relic':
      echoes.push({ kind: 'relic', value: outcome.inventory })
      break
    case 'title':
      echoes.push({ kind: 'title', value: outcome.title })
      break
    case 'oath':
      echoes.push({ kind: 'oath', value: outcome.oath })
      break
    case 'truth':
      echoes.push({ kind: 'truth', value: outcome.truth })
      break
    case 'refusal':
      break
  }

  return echoes
}

function buildEventBatch(route: SwordsOfChaosRoute): SwordsOfChaosEventBatch {
  const outcome = getSwordsOfChaosOutcome(route)
  return {
    at: Date.now(),
    events: [
      {
        kind: 'run_history_update',
        gameResult: outcome.gameResult,
        playedAt: Date.now(),
      },
      {
        kind: 'thread_candidate_add',
        thread: 'trench-coat-turtle-alley',
      },
      {
        kind: 'thread_candidate_add',
        thread: getOutcomeThread(route),
      },
      {
        kind: 'callback_marker_add',
        marker: route,
      },
      {
        kind: 'encounter_memory_record',
        encounter: 'trench-coat-turtle-alley',
        opener: route.split(':')[0],
        route,
      },
      {
        kind: 'world_flag_add',
        flag: `swords-route:${route}`,
      },
      ...(outcome.key === 'relic'
        ? [{ kind: 'inventory_add', item: outcome.inventory } as const]
        : []),
      ...(outcome.key === 'title'
        ? [{ kind: 'title_add', title: outcome.title } as const]
        : []),
    ],
  }
}

export function resolveSwordsOfChaosRoute(
  openingChoice: SwordsOfChaosOpeningChoice,
  secondChoice: SwordsOfChaosSecondChoice,
): SwordsOfChaosResolution {
  const route = `${openingChoice}:${secondChoice}` as SwordsOfChaosRoute
  const outcome = getSwordsOfChaosOutcome(route)
  return {
    route,
    outcome,
    eventBatch: buildEventBatch(route),
    hostEchoes: buildHostEchoes(route),
    rarityUnlock: outcome.key === 'relic' ? outcome.rarityUnlock : undefined,
    resultText: outcome.ending,
  }
}
