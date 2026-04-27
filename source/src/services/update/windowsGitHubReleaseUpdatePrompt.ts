import type { PromptRequest } from '../../types/hooks.js'
import type { StartupUpdateSignal } from './startupUpdateSignalCore.js'

export function shouldOfferWindowsGitHubReleaseStartupUpdate(
  signal: StartupUpdateSignal | null,
  platform: NodeJS.Platform = process.platform,
  arch: NodeJS.Architecture = process.arch,
): signal is StartupUpdateSignal {
  return (
    platform === 'win32' &&
    arch === 'x64' &&
    signal !== null &&
    signal.installationType === 'github-release' &&
    signal.versionSource === 'github-release'
  )
}

export function buildWindowsGitHubReleaseUpdatePrompt(
  signal: StartupUpdateSignal,
): {
  title: string
  request: PromptRequest
} {
  return {
    title: 'Windows update available',
    request: {
      prompt: `windows-github-release-update:${signal.latestVersion}`,
      message:
        `SeaTurtle ${signal.latestVersion} is available for this Windows release install. Update now?\n\n` +
        'CT will close briefly so Windows can replace ct.exe.',
      options: [
        {
          key: 'yes',
          label: 'Yes',
          description: 'Update now and exit so Windows can swap in the new ct.exe.',
        },
        {
          key: 'no',
          label: 'No',
          description: 'Keep running this version for now.',
        },
      ],
    },
  }
}
