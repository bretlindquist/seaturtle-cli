import {
  getLatestVersion,
  getLatestVersionFromGcs,
  getMaxVersion,
  shouldSkipVersion,
} from '../../utils/autoUpdater.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { getCurrentInstallationType } from '../../utils/doctorDiagnostic.js'
import { getLatestSeaTurtleReleaseVersion } from '../../utils/githubReleaseInstall.js'
import { getPackageManager } from '../../utils/nativeInstaller/packageManagers.js'
import { isAutoUpdaterDisabled } from '../../utils/config.js'
import type { ReleaseChannel } from '../../utils/config.js'
import { logForDebugging } from '../../utils/debug.js'
import {
  buildStartupUpdateSignal,
  type StartupUpdateSignal,
} from './startupUpdateSignalCore.js'
import { getLatestSeaTurtleUpstreamVersion } from './seaTurtleUpstreamVersion.js'

export async function getStartupUpdateSignal(): Promise<StartupUpdateSignal | null> {
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    isAutoUpdaterDisabled()
  ) {
    return null
  }

  try {
    const channel = (getInitialSettings()?.autoUpdatesChannel ??
      'latest') as ReleaseChannel
    const installationType = await getCurrentInstallationType()
    const packageManager =
      installationType === 'package-manager'
        ? await getPackageManager()
        : undefined
    const githubReleaseVersion =
      installationType === 'github-release'
        ? await getLatestSeaTurtleReleaseVersion()
        : null
    const upstreamVersion =
      installationType === 'source-wrapper'
        ? await getLatestSeaTurtleUpstreamVersion()
        : null
    const latestVersion =
      githubReleaseVersion ??
      upstreamVersion ??
      (installationType === 'package-manager'
        ? await getLatestVersionFromGcs(channel)
        : await getLatestVersion(channel))
    const maxVersion = await getMaxVersion()

    return buildStartupUpdateSignal({
      currentVersion: MACRO.VERSION,
      latestVersion,
      versionSource: upstreamVersion
        ? 'seaturtle-upstream'
        : githubReleaseVersion
          ? 'github-release'
        : 'legacy-package-source',
      maxVersion,
      channel,
      installationType,
      packageManager,
      shouldSkipVersion,
    })
  } catch (error) {
    logForDebugging(`Startup update check failed: ${String(error)}`)
    return null
  }
}
