import type { SwordsOfChaosHostEcho } from '../types/echoes.js'
import type { SwordsOfChaosEventBatch } from '../types/events.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type {
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosRoute,
  SwordsOfChaosSecondChoice,
} from '../types/outcomes.js'
import type { SwordsOfChaosResolution } from '../types/resolution.js'
import type {
  SwordsOfChaosCharacterDevelopment,
  SwordsOfChaosCharacterSheet,
} from '../types/save.js'
import { getSwordsCharacterDevelopmentAdvance } from './characterPlanner.js'
import { getSwordsNextMagicState } from './magicPlanner.js'
import { getSwordsOfChaosOutcome } from './outcomes.js'
import {
  buildSwordsStoryResultText,
  getSwordsCarryForward,
  getSwordsChapterTitle,
  getSwordsNextContinuation,
  getSwordsNextSceneState,
  getSwordsNextStoryObjective,
  getSwordsNextStoryTension,
  getSwordsOutcomeVariationLines,
} from './storyPlanner.js'
import {
  getSwordsEncounterMemoryKey,
  type SwordsOfChaosEncounterLocus,
} from './worldMap.js'
import { isSwordsSeaTurtleFavoredChoice } from './seaturtleChoice.js'

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

function buildEventBatch(
  route: SwordsOfChaosRoute,
  encounterLocus: SwordsOfChaosEncounterLocus,
  options?: {
    character?: SwordsOfChaosCharacterSheet
    currentDevelopment?: SwordsOfChaosCharacterDevelopment
    currentMagic?: import('../types/save.js').SwordsOfChaosMagicState
    relevantMemory?: SwordsOfChaosRelevantMemory
    seaturtleWitnessed?: boolean
    currentChapter?: number
    previousObjective?: string
  },
): SwordsOfChaosEventBatch {
  const outcome = getSwordsOfChaosOutcome(route)
  const outcomeThread = getOutcomeThread(route)
  const seenAt = Date.now()
  const encounterKey = getSwordsEncounterMemoryKey(encounterLocus)
  const chapter = (options?.currentChapter ?? 0) + 1
  const chapterTitle = getSwordsChapterTitle({
    outcomeThread,
    encounterLocus,
    outcome,
  })
  const currentObjective = getSwordsNextStoryObjective({
    outcomeThread,
    encounterLocus,
    outcome,
    previousObjective: options?.previousObjective,
  })
  const tension = getSwordsNextStoryTension({
    route,
    outcome,
  })
  const carryForward = getSwordsCarryForward({
    route,
    outcomeThread,
    encounterLocus,
    outcome,
  })
  const continuation = getSwordsNextContinuation({
    outcomeThread,
    currentObjective,
    carryForward,
  })
  const [openingChoice, secondChoice] = route.split(':') as [
    SwordsOfChaosOpeningChoice,
    SwordsOfChaosSecondChoice,
  ]
  const sceneState = getSwordsNextSceneState({
    openingChoice,
    secondChoice,
    outcomeThread,
    continuation,
    currentObjective,
  })
  const characterAdvance =
    options?.character && options.currentDevelopment
      ? getSwordsCharacterDevelopmentAdvance({
          character: options.character,
          currentDevelopment: options.currentDevelopment,
          openingChoice,
          secondChoice,
          outcomeThread,
          outcome,
        })
      : null
  const magicState =
    options?.currentMagic
      ? getSwordsNextMagicState({
          currentMagic: options.currentMagic,
          relevantMemory: options.relevantMemory,
          encounterLocus,
        })
      : null
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
        thread: encounterKey,
      },
      {
        kind: 'thread_candidate_add',
        thread: outcomeThread,
      },
      {
        kind: 'thread_memory_record',
        thread: outcomeThread,
        seenAt,
      },
      {
        kind: 'callback_marker_add',
        marker: route,
      },
      {
        kind: 'encounter_memory_record',
        encounter: encounterKey,
        opener: route.split(':')[0],
        route,
      },
      {
        kind: 'world_flag_add',
        flag: `swords-route:${route}`,
      },
      ...(characterAdvance
        ? [
            {
              kind: 'character_development_update',
              development: characterAdvance,
              milestone: characterAdvance.milestone,
              xpDelta: characterAdvance.xpDelta,
            } as const,
          ]
        : []),
      ...(magicState
        ? [
            {
              kind: 'magic_state_update',
              magic: magicState,
            } as const,
          ]
        : []),
      {
        kind: 'story_state_update',
        activeLocus: encounterLocus,
        activeThread: outcomeThread,
        chapter,
        chapterTitle,
        tension,
        currentObjective,
        carryForward,
        continuation,
        sceneState,
        lastOutcomeKey: outcome.key,
        advancedAt: seenAt,
      },
      ...(outcome.key === 'relic'
        ? [{ kind: 'inventory_add', item: outcome.inventory } as const]
        : []),
      ...(outcome.key === 'title'
        ? [{ kind: 'title_add', title: outcome.title } as const]
        : []),
      ...(options?.seaturtleWitnessed &&
      isSwordsSeaTurtleFavoredChoice(
        route.split(':')[0] as SwordsOfChaosOpeningChoice,
        route.split(':')[1] as SwordsOfChaosSecondChoice,
      )
        ? [
            {
              kind: 'seaturtle_favor_record',
              favorAt: seenAt,
            } as const,
            {
              kind: 'world_flag_add',
              flag: 'seaturtle:favored-quiet-line',
            } as const,
          ]
        : []),
    ],
  }
}

export function resolveSwordsOfChaosRoute(
  openingChoice: SwordsOfChaosOpeningChoice,
  secondChoice: SwordsOfChaosSecondChoice,
  options?: {
    encounterLocus?: SwordsOfChaosEncounterLocus
    character?: SwordsOfChaosCharacterSheet
    currentDevelopment?: SwordsOfChaosCharacterDevelopment
    currentMagic?: import('../types/save.js').SwordsOfChaosMagicState
    relevantMemory?: SwordsOfChaosRelevantMemory
    seaturtleWitnessed?: boolean
    currentChapter?: number
    previousObjective?: string
  },
): SwordsOfChaosResolution {
  const route = `${openingChoice}:${secondChoice}` as SwordsOfChaosRoute
  const outcome = getSwordsOfChaosOutcome(route)
  const encounterLocus = options?.encounterLocus ?? 'alley'
  const activeThread = getOutcomeThread(route)
  const chapter = (options?.currentChapter ?? 0) + 1
  const chapterTitle = getSwordsChapterTitle({
    outcomeThread: activeThread,
    encounterLocus,
    outcome,
  })
  const currentObjective = getSwordsNextStoryObjective({
    outcomeThread: activeThread,
    encounterLocus,
    outcome,
    previousObjective: options?.previousObjective,
  })
  const tension = getSwordsNextStoryTension({
    route,
    outcome,
  })
  const carryForward = getSwordsCarryForward({
    route,
    outcomeThread: activeThread,
    encounterLocus,
    outcome,
  })
  const continuation = getSwordsNextContinuation({
    outcomeThread: activeThread,
    currentObjective,
    carryForward,
  })
  const sceneState = getSwordsNextSceneState({
    openingChoice,
    secondChoice,
    outcomeThread: activeThread,
    continuation,
    currentObjective,
  })
  const characterAdvance =
    options?.character && options.currentDevelopment
      ? getSwordsCharacterDevelopmentAdvance({
          character: options.character,
          currentDevelopment: options.currentDevelopment,
          openingChoice,
          secondChoice,
          outcomeThread: activeThread,
          outcome,
        })
      : {
          focus: null,
          title: null,
          lesson: null,
          pressure: null,
          stage: 0,
          lastUpdatedAt: null,
        }
  const variationMemory: SwordsOfChaosRelevantMemory = {
    priorRoutes: [],
    revisitCount: 0,
    storyChapter: chapter,
    storyTension: tension,
    currentObjective,
    carryForward,
    continuation,
    sceneState,
    characterDevelopment:
      characterAdvance.focus && characterAdvance.title && characterAdvance.lesson
        ? characterAdvance
        : undefined,
    seaturtleGlimpsed: Boolean(options?.seaturtleWitnessed),
    seaturtleOpeningPending: false,
    seaturtleBond: 0,
    seaturtleFavor: 0,
  }

  return {
    route,
    outcome,
    eventBatch: buildEventBatch(route, encounterLocus, {
      character: options?.character,
      currentDevelopment: options?.currentDevelopment,
      currentMagic: options?.currentMagic,
      relevantMemory: options?.relevantMemory,
      currentChapter: options?.currentChapter,
      previousObjective: options?.previousObjective,
      seaturtleWitnessed: options?.seaturtleWitnessed,
    }),
    hostEchoes: buildHostEchoes(route),
    rarityUnlock: outcome.key === 'relic' ? outcome.rarityUnlock : undefined,
    resultText: buildSwordsStoryResultText({
      baseEnding: outcome.ending,
      chapter,
      chapterTitle,
      encounterLocus,
      outcomeThread: activeThread,
      outcome,
      nextObjective: currentObjective,
      nextTension: tension,
      carryForward,
      characterTitle: characterAdvance.title ?? undefined,
      characterStage:
        characterAdvance.title && characterAdvance.stage > 0
          ? characterAdvance.stage
          : undefined,
      characterLesson: characterAdvance.lesson ?? undefined,
      variationLines: getSwordsOutcomeVariationLines({
        encounterLocus,
        relevantMemory: variationMemory,
      }),
    }),
    storyAdvance: {
      activeLocus: encounterLocus,
      activeThread,
      chapter,
      chapterTitle,
      tension,
      currentObjective,
      carryForward,
      continuation,
      sceneState,
    },
    characterAdvance,
  }
}
