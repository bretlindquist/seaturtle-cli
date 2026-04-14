import type { ReleaseChannel } from '../../utils/config.js'
import { gte, gt } from '../../utils/semver.js'
import type { InstallationType } from '../../utils/doctorDiagnostic.js'
import type { PackageManager } from '../../utils/nativeInstaller/packageManagers.js'

export type StartupUpdateAction = {
  label: string
  command: string
}

export type StartupUpdateSignal = {
  currentVersion: string
  latestVersion: string
  versionSource: 'seaturtle-upstream' | 'legacy-package-source'
  channel: ReleaseChannel
  installationType: InstallationType
  packageManager?: PackageManager
  action: StartupUpdateAction
}

export type StartupUpdateSignalInput = {
  currentVersion: string
  latestVersion: string | null
  versionSource?: StartupUpdateSignal['versionSource']
  maxVersion?: string
  channel: ReleaseChannel
  installationType: InstallationType
  packageManager?: PackageManager
  shouldSkipVersion: (version: string) => boolean
}

export function getStartupUpdateAction(
  installationType: InstallationType,
  packageManager?: PackageManager,
): StartupUpdateAction {
  if (installationType === 'package-manager') {
    switch (packageManager) {
      case 'homebrew':
        return {
          label: 'Update with Homebrew',
          command: 'use your Homebrew upgrade command for SeaTurtle',
        }
      case 'winget':
        return {
          label: 'Update with WinGet',
          command: 'use your winget upgrade command for SeaTurtle',
        }
      case 'apk':
        return {
          label: 'Update with apk',
          command: 'use your apk upgrade command for SeaTurtle',
        }
      default:
        return {
          label: 'Update with your package manager',
          command: 'use your package manager update command',
        }
    }
  }

  return {
    label: 'Update SeaTurtle',
    command: 'ct update',
  }
}

export function getActionableStartupUpdateVersion({
  currentVersion,
  latestVersion,
  maxVersion,
  shouldSkipVersion,
}: Pick<
  StartupUpdateSignalInput,
  'currentVersion' | 'latestVersion' | 'maxVersion' | 'shouldSkipVersion'
>): string | null {
  if (!latestVersion) {
    return null
  }

  let actionableVersion = latestVersion
  if (maxVersion && gt(actionableVersion, maxVersion)) {
    if (gte(currentVersion, maxVersion)) {
      return null
    }
    actionableVersion = maxVersion
  }

  if (gte(currentVersion, actionableVersion)) {
    return null
  }

  if (shouldSkipVersion(actionableVersion)) {
    return null
  }

  return actionableVersion
}

export function buildStartupUpdateSignal(
  input: StartupUpdateSignalInput,
): StartupUpdateSignal | null {
  const latestVersion = getActionableStartupUpdateVersion(input)
  if (!latestVersion) {
    return null
  }

  return {
    currentVersion: input.currentVersion,
    latestVersion,
    versionSource: input.versionSource ?? 'legacy-package-source',
    channel: input.channel,
    installationType: input.installationType,
    packageManager: input.packageManager,
    action: getStartupUpdateAction(input.installationType, input.packageManager),
  }
}
