import { appendSwordsOfChaosEvent } from './eventHistory.js'

export function recordSwordsOfChaosRetreat(stage: 'opening' | 'second-beat'): void {
  appendSwordsOfChaosEvent({
    at: Date.now(),
    kind: 'retreated',
    detail: {
      stage,
    },
  })
}
