import { getGlobalConfig } from './config.js'

export type DevRuntimeOverrides = {
  simulateAntRuntime?: boolean
  forceChicagoGate?: boolean
}

export function getDevRuntimeOverrides(): DevRuntimeOverrides {
  try {
    return getGlobalConfig().devRuntimeOverrides ?? {}
  } catch {
    return {}
  }
}

export function isSimulatedAntRuntimeEnabled(): boolean {
  return getDevRuntimeOverrides().simulateAntRuntime === true
}

export function isChicagoGateForcedForTesting(): boolean {
  return getDevRuntimeOverrides().forceChicagoGate === true
}
