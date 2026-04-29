import type { MainLoopProviderRuntime } from '../api/providerRuntime.js'
import { getMainLoopProviderRuntime } from '../api/providerRuntime.js'
import {
  type RemoteHostOffloadBuildReadiness,
  getRemoteHostOffloadBuildReadiness,
} from '../../ssh/createSSHSession.js'
import { getInitialSettings } from '../../utils/settings/settings.js'

export type AutoworkCloudOffloadStatus =
  | 'unavailable'
  | 'available'
  | 'active'

export type AutoworkCloudOffloadPath = 'none' | 'ct-ssh'

export type AutoworkCloudOffloadCapability = {
  status: AutoworkCloudOffloadStatus
  active: boolean
  path: AutoworkCloudOffloadPath
  configuredHostCount: number
  reason: string
}

type ResolveAutoworkCloudOffloadCapabilityOptions = {
  runtime?: MainLoopProviderRuntime
  sshConfigCount?: number
  buildReadiness?: RemoteHostOffloadBuildReadiness
  active?: boolean
}

function isProviderManagedRemoteOffloadSupported(
  runtime: MainLoopProviderRuntime,
): boolean {
  return runtime.provider === 'openai-codex' || runtime.provider === 'gemini'
}

function getConfiguredHostCount(): number {
  return getInitialSettings().sshConfigs?.length ?? 0
}

function getAvailableReason(configuredHostCount: number): string {
  if (configuredHostCount > 0) {
    return `Remote-host offload is available via ct ssh. ${configuredHostCount} saved SSH ${configuredHostCount === 1 ? 'config is' : 'configs are'} ready for operator selection.`
  }

  return 'Remote-host offload is available via ct ssh <host>. No saved SSH configs are present yet, but any reachable host can be used explicitly.'
}

export function resolveAutoworkCloudOffloadCapability(
  options: ResolveAutoworkCloudOffloadCapabilityOptions = {},
): AutoworkCloudOffloadCapability {
  const runtime = options.runtime ?? getMainLoopProviderRuntime()
  const configuredHostCount = options.sshConfigCount ?? getConfiguredHostCount()
  const buildReadiness =
    options.buildReadiness ?? getRemoteHostOffloadBuildReadiness()
  const active = options.active === true

  if (active) {
    return {
      status: 'active',
      active: true,
      path: 'ct-ssh',
      configuredHostCount,
      reason:
        'Remote-host offload is currently active through the ct ssh execution path.',
    }
  }

  if (!isProviderManagedRemoteOffloadSupported(runtime)) {
    return {
      status: 'unavailable',
      active: false,
      path: 'none',
      configuredHostCount,
      reason:
        'Remote-host offload is implemented for OpenAI/Codex and Gemini in this build. Anthropic continues to use the claude.ai remote path.',
    }
  }

  if (!runtime.executionEnabled || runtime.authState === 'not-configured') {
    return {
      status: 'unavailable',
      active: false,
      path: 'none',
      configuredHostCount,
      reason: `${runtime.displayName} auth is not ready for ct ssh offload in this session.`,
    }
  }

  if (!buildReadiness.ready) {
    return {
      status: 'unavailable',
      active: false,
      path: 'none',
      configuredHostCount,
      reason:
        buildReadiness.reason ??
        'Remote-host offload is not ready in this source build.',
    }
  }

  return {
    status: 'available',
    active: false,
    path: 'ct-ssh',
    configuredHostCount,
    reason: getAvailableReason(configuredHostCount),
  }
}
