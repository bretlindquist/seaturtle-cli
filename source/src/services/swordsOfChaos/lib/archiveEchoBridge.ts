import {
  addInventoryItem,
  addLegendEvent,
  addOath,
  addTitle,
  addUserTruth,
} from '../../projectIdentity/archives.js'
import type {
  SwordsOfChaosHostEcho,
  SwordsOfChaosHostEchoResult,
} from '../types/echoes.js'

export function applySwordsOfChaosHostEchoes(
  echoes: SwordsOfChaosHostEcho[],
  root?: string,
): SwordsOfChaosHostEchoResult {
  for (const echo of echoes) {
    switch (echo.kind) {
      case 'title':
        addTitle(echo.value, root)
        break
      case 'relic':
        addInventoryItem(echo.value, root)
        break
      case 'oath':
        addOath(echo.value, root)
        break
      case 'truth':
        addUserTruth(echo.value, root)
        break
      case 'legend':
        addLegendEvent(echo.value, root)
        break
    }
  }

  return {
    applied: echoes.length,
  }
}
