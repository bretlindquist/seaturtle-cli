export { getSwordsOfChaosPaths } from './lib/paths.js'
export {
  createDefaultSwordsOfChaosSave,
  ensureSwordsOfChaosSaveExists,
  loadSwordsOfChaosSave,
  saveSwordsOfChaosSave,
} from './lib/saveManager.js'
export {
  applySwordsOfChaosOutcomeEchoes,
  applySwordsOfChaosEventBatchToSave,
  ensureSwordsOfChaosRuntimeReady,
} from './lib/runtimeFacade.js'
export { getSwordsOfChaosOutcome } from './lib/outcomes.js'
export type { SwordsOfChaosRuntime } from './types/runtime.js'
export type { SwordsOfChaosSaveFile } from './types/save.js'
export type { SwordsOfChaosHostEcho } from './types/echoes.js'
export type {
  SwordsOfChaosEventBatch,
  SwordsOfChaosHistoryEventRecord,
  SwordsOfChaosMutationEvent,
} from './types/events.js'
export type {
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosOutcome,
  SwordsOfChaosRoute,
  SwordsOfChaosSecondChoice,
} from './types/outcomes.js'
