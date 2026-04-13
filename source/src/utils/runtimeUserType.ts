import { isSimulatedAntRuntimeEnabled } from './devOverrides.js'

export function isBuildTimeAntUserType(): boolean {
  return process.env.USER_TYPE === 'ant'
}

export function isAntRuntimeEnabled(): boolean {
  return isBuildTimeAntUserType() || isSimulatedAntRuntimeEnabled()
}

export function isExternalRuntimeOnly(): boolean {
  return !isAntRuntimeEnabled()
}
