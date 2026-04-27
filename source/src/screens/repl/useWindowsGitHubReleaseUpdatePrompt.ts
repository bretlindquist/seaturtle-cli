import * as React from 'react'
import { getStartupUpdateSignal } from '../../services/update/startupUpdateSignal.js'
import type { PromptRequest, PromptResponse } from '../../types/hooks.js'
import { logForDebugging } from '../../utils/debug.js'
import { installGitHubReleaseBinary } from '../../utils/githubReleaseInstall.js'
import { gracefulShutdown } from '../../utils/gracefulShutdown.js'
import {
  buildWindowsGitHubReleaseUpdatePrompt,
  shouldOfferWindowsGitHubReleaseStartupUpdate,
} from '../../services/update/windowsGitHubReleaseUpdatePrompt.js'

type PromptQueueItem = {
  request: PromptRequest
  title: string
  toolInputSummary?: string | null
  resolve: (response: PromptResponse) => void
  reject: (error: Error) => void
}

type UseWindowsGitHubReleaseUpdatePromptInput = {
  setPromptQueue: React.Dispatch<React.SetStateAction<PromptQueueItem[]>>
}

function requestPrompt(
  setPromptQueue: React.Dispatch<React.SetStateAction<PromptQueueItem[]>>,
  prompt: ReturnType<typeof buildWindowsGitHubReleaseUpdatePrompt>,
): Promise<PromptResponse> {
  return new Promise((resolve, reject) => {
    setPromptQueue(prev => [
      ...prev,
      {
        title: prompt.title,
        request: prompt.request,
        resolve,
        reject,
      },
    ])
  })
}

export function useWindowsGitHubReleaseUpdatePrompt({
  setPromptQueue,
}: UseWindowsGitHubReleaseUpdatePromptInput): void {
  const hasCheckedRef = React.useRef(false)

  React.useEffect(() => {
    if (hasCheckedRef.current) {
      return
    }
    hasCheckedRef.current = true

    void (async () => {
      const signal = await getStartupUpdateSignal()
      if (!shouldOfferWindowsGitHubReleaseStartupUpdate(signal)) {
        return
      }

      const prompt = buildWindowsGitHubReleaseUpdatePrompt(signal)
      let response: PromptResponse
      try {
        response = await requestPrompt(setPromptQueue, prompt)
      } catch {
        return
      }

      if (response.selected !== 'yes') {
        return
      }

      try {
        const nextVersion = await installGitHubReleaseBinary({
          version: signal.latestVersion,
        })
        await gracefulShutdown(0, 'other', {
          finalMessage: `SeaTurtle ${nextVersion} is ready. CT will exit now so Windows can replace ct.exe. Restart ct after it closes.`,
        })
      } catch (error) {
        logForDebugging(
          `Windows GitHub-release startup update failed: ${String(error)}`,
        )
        process.stderr.write(
          `Error: Failed to update installed CT: ${String(error)}\n`,
        )
      }
    })()
  }, [setPromptQueue])
}
