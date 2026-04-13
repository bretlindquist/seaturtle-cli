import { feature } from 'bun:bundle'
import type { ToolPermissionContext } from '../../Tool.js'
import { logForDebugging } from '../debug.js'
import { isAntRuntimeEnabled } from '../runtimeUserType.js'
import type { PermissionMode } from './PermissionMode.js'
import {
  getAutoModeUnavailableReason,
  isAutoModeGateEnabled,
  transitionPermissionMode,
} from './permissionSetup.js'

// Checks both the cached isAutoModeAvailable (set at startup by
// verifyAutoModeGateAccess) and the live isAutoModeGateEnabled() — these can
// diverge if the circuit breaker or settings change mid-session. The
// live check prevents transitionPermissionMode from throwing
// (permissionSetup.ts:~559), which would silently crash the shift+tab handler
// and leave the user stuck at the current mode.
function canCycleToAuto(ctx: ToolPermissionContext): boolean {
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    const gateEnabled = isAutoModeGateEnabled()
    const can = !!ctx.isAutoModeAvailable && gateEnabled
    if (!can) {
      logForDebugging(
        `[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${ctx.isAutoModeAvailable} isAutoModeGateEnabled=${gateEnabled} reason=${getAutoModeUnavailableReason()}`,
      )
    }
    return can
  }
  return false
}

function getPermissionModeCycleOrder(
  toolPermissionContext: ToolPermissionContext,
): PermissionMode[] {
  if (isAntRuntimeEnabled()) {
    const order: PermissionMode[] = ['default']
    if (toolPermissionContext.isBypassPermissionsModeAvailable) {
      order.push('bypassPermissions')
    }
    if (canCycleToAuto(toolPermissionContext)) {
      order.push('auto')
    }
    return order
  }

  const order: PermissionMode[] = ['default', 'acceptEdits', 'plan']
  if (toolPermissionContext.isBypassPermissionsModeAvailable) {
    order.push('bypassPermissions')
  }
  if (canCycleToAuto(toolPermissionContext)) {
    order.push('auto')
  }
  return order
}

export function getAdjacentPermissionMode(
  toolPermissionContext: ToolPermissionContext,
  delta: 1 | -1,
): PermissionMode {
  const cycleOrder = getPermissionModeCycleOrder(toolPermissionContext)
  if (cycleOrder.length === 0) {
    return 'default'
  }

  const currentIndex = cycleOrder.indexOf(toolPermissionContext.mode)
  const safeIndex = currentIndex === -1 ? 0 : currentIndex
  const nextIndex =
    (safeIndex + delta + cycleOrder.length) % cycleOrder.length
  return cycleOrder[nextIndex] ?? 'default'
}

/**
 * Determines the next permission mode when cycling through modes with Shift+Tab.
 */
export function getNextPermissionMode(
  toolPermissionContext: ToolPermissionContext,
  _teamContext?: { leadAgentId: string },
): PermissionMode {
  return getAdjacentPermissionMode(toolPermissionContext, 1)
}

/**
 * Computes the next permission mode and prepares the context for it.
 * Handles any context cleanup needed for the target mode (e.g., stripping
 * dangerous permissions when entering auto mode).
 *
 * @returns The next mode and the context to use (with dangerous permissions stripped if needed)
 */
export function cyclePermissionMode(
  toolPermissionContext: ToolPermissionContext,
  teamContext?: { leadAgentId: string },
): { nextMode: PermissionMode; context: ToolPermissionContext } {
  const nextMode = getNextPermissionMode(toolPermissionContext, teamContext)
  return {
    nextMode,
    context: transitionPermissionMode(
      toolPermissionContext.mode,
      nextMode,
      toolPermissionContext,
    ),
  }
}
