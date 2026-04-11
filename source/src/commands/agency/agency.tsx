import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  formatAgencyList,
  formatAgencyStatus,
  getAgencyHelpText,
  installAgencySelection,
  removeAgencyInstall,
  updateAgencyInstall,
} from '../../services/agency/index.js'
import { clearAgentDefinitionsCache } from '../../tools/AgentTool/loadAgentsDir.js'
import { parseAgencyArgs } from './parseArgs.js'

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const parsed = parseAgencyArgs(args)

  try {
    switch (parsed.type) {
      case 'help':
        onDone(getAgencyHelpText(), { display: 'system' })
        return null

      case 'status':
        onDone(formatAgencyStatus(), { display: 'system' })
        return null

      case 'list':
        onDone(formatAgencyList(), { display: 'system' })
        return null

      case 'update': {
        const result = await updateAgencyInstall()
        clearAgentDefinitionsCache()

        const lines = [
          `Agency update complete at ${result.manifest.installedCommit}.`,
          `Updated: ${result.updated.length}`,
          `Unchanged: ${result.unchanged.length}`,
          `Skipped: ${result.skipped.length}`,
          `Missing upstream: ${result.missingUpstream.length}`,
        ]

        if (result.updated.length > 0) {
          lines.push('')
          for (const entry of result.updated) {
            lines.push(`~ ${entry.id}  ${entry.title}`)
          }
        }

        if (result.skipped.length > 0) {
          lines.push('')
          for (const entry of result.skipped) {
            lines.push(`- ${entry.id}  ${entry.reason}`)
          }
        }

        onDone(lines.join('\n'), { display: 'system' })
        return null
      }

      case 'install': {
        const result = await installAgencySelection(parsed.target, parsed.ref)
        clearAgentDefinitionsCache()

        const lines = [
          `Agency install complete at ${result.manifest.installedCommit}.`,
          `Installed: ${result.installed.length}`,
          `Skipped: ${result.skipped.length}`,
        ]

        if (result.installed.length > 0) {
          lines.push('')
          for (const entry of result.installed) {
            lines.push(`+ ${entry.id}  ${entry.title}`)
          }
        }

        if (result.skipped.length > 0) {
          lines.push('')
          for (const entry of result.skipped) {
            lines.push(`- ${entry.id}  ${entry.reason}`)
          }
        }

        onDone(lines.join('\n'), { display: 'system' })
        return null
      }

      case 'remove': {
        const result = removeAgencyInstall(parsed.target)
        clearAgentDefinitionsCache()

        const lines = [
          `Agency remove complete.`,
          `Removed: ${result.removed.length}`,
          `Skipped: ${result.skipped.length}`,
          `Remaining: ${result.remaining.length}`,
        ]

        if (result.removed.length > 0) {
          lines.push('')
          for (const entry of result.removed) {
            lines.push(`- ${entry.id}  ${entry.title}`)
          }
        }

        if (result.skipped.length > 0) {
          lines.push('')
          for (const entry of result.skipped) {
            lines.push(`! ${entry.id}  ${entry.reason}`)
          }
        }

        onDone(lines.join('\n'), { display: 'system' })
        return null
      }
    }
  } catch (error) {
    onDone(
      error instanceof Error ? error.message : 'Agency command failed.',
      { display: 'system' },
    )
    return null
  }
}
