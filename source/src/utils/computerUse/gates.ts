import { feature } from 'bun:bundle'
import type { CoordinateMode, CuSubGates } from '@ant/computer-use-mcp/types'

import { getIsNonInteractiveSession } from '../../bootstrap/state.js'
import { getDynamicConfig_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'
import { getSubscriptionType } from '../auth.js'
import { isChicagoGateForcedForTesting } from '../devOverrides.js'
import { isEnvTruthy } from '../envUtils.js'
import { getPlatform } from '../platform.js'
import { isAntRuntimeEnabled, isBuildTimeAntUserType } from '../runtimeUserType.js'

type ChicagoConfig = CuSubGates & {
  enabled: boolean
  coordinateMode: CoordinateMode
}

const DEFAULTS: ChicagoConfig = {
  enabled: false,
  pixelValidation: false,
  clipboardPasteMultiline: true,
  mouseAnimation: true,
  hideBeforeAction: true,
  autoTargetDisplay: true,
  clipboardGuard: true,
  coordinateMode: 'pixels',
}

// Spread over defaults so a partial JSON ({"enabled": true} alone) inherits the
// rest. The generic on getDynamicConfig is a type assertion, not a validator —
// GB returning a partial object would otherwise surface undefined fields.
function readConfig(): ChicagoConfig {
  return {
    ...DEFAULTS,
    ...getDynamicConfig_CACHED_MAY_BE_STALE<Partial<ChicagoConfig>>(
      'tengu_malort_pedway',
      DEFAULTS,
    ),
  }
}

// Max/Pro only for external rollout. Ant bypass so dogfooding continues
// regardless of subscription tier — not all ants are max/pro, and per
// CLAUDE.md:281, USER_TYPE !== 'ant' branches get zero antfooding.
function hasRequiredSubscription(): boolean {
  if (isAntRuntimeEnabled()) {
    return true
  }
  const tier = getSubscriptionType()
  return tier === 'max' || tier === 'pro'
}

export function getChicagoEnabled(): boolean {
  if (isChicagoGateForcedForTesting()) {
    return true
  }
  // Disable for ants whose shell inherited monorepo dev config.
  // MONOREPO_ROOT_DIR is exported by config/local/zsh/zshrc, which
  // laptop-setup.sh wires into ~/.zshrc — its presence is the cheap
  // proxy for "has monorepo access". Override: ALLOW_ANT_COMPUTER_USE_MCP=1.
  if (
    isBuildTimeAntUserType() &&
    process.env.MONOREPO_ROOT_DIR &&
    !isEnvTruthy(process.env.ALLOW_ANT_COMPUTER_USE_MCP)
  ) {
    return false
  }
  return hasRequiredSubscription() && readConfig().enabled
}

export type ChicagoAvailabilitySnapshot = {
  buildEnabled: boolean
  platformSupported: boolean
  interactiveSession: boolean
  subscriptionEligible: boolean
  gateEnabled: boolean
  blockedByAntMonorepoGuard: boolean
  available: boolean
}

export function getChicagoAvailabilitySnapshot(): ChicagoAvailabilitySnapshot {
  const buildEnabled = feature('CHICAGO_MCP')
  const platformSupported = getPlatform() === 'macos'
  const interactiveSession = !getIsNonInteractiveSession()
  const subscriptionEligible = hasRequiredSubscription()
  const gateEnabled = isChicagoGateForcedForTesting() || readConfig().enabled
  const blockedByAntMonorepoGuard =
    isAntRuntimeEnabled() &&
    !!process.env.MONOREPO_ROOT_DIR &&
    !isEnvTruthy(process.env.ALLOW_ANT_COMPUTER_USE_MCP)

  return {
    buildEnabled,
    platformSupported,
    interactiveSession,
    subscriptionEligible,
    gateEnabled,
    blockedByAntMonorepoGuard,
    available:
      buildEnabled &&
      platformSupported &&
      interactiveSession &&
      subscriptionEligible &&
      gateEnabled &&
      !blockedByAntMonorepoGuard,
  }
}

export function getChicagoEnablementSummary(): string {
  const snapshot = getChicagoAvailabilitySnapshot()
  if (snapshot.available) {
    return 'Ready'
  }

  const reasons: string[] = []
  if (!snapshot.buildEnabled) reasons.push('build lacks Chicago runtime')
  if (!snapshot.platformSupported) reasons.push('macOS only')
  if (!snapshot.interactiveSession) reasons.push('interactive session required')
  if (!snapshot.subscriptionEligible) reasons.push('Pro or Max required')
  if (!snapshot.gateEnabled) reasons.push('Chicago gate off')
  if (snapshot.blockedByAntMonorepoGuard)
    reasons.push('blocked by ant monorepo guard')

  return reasons.length > 0 ? `Unavailable: ${reasons.join(' · ')}` : 'Unavailable'
}

export function getChicagoSubGates(): CuSubGates {
  const { enabled: _e, coordinateMode: _c, ...subGates } = readConfig()
  return subGates
}

// Frozen at first read — setup.ts builds tool descriptions and executor.ts
// scales coordinates off the same value. A live read here lets a mid-session
// GB flip tell the model "pixels" while transforming clicks as normalized.
let frozenCoordinateMode: CoordinateMode | undefined
export function getChicagoCoordinateMode(): CoordinateMode {
  frozenCoordinateMode ??= readConfig().coordinateMode
  return frozenCoordinateMode
}
