import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  buildAgencyRunPrompt,
  formatAgencyList,
  formatAgencyStatus,
  getAgencyHelpText,
  installAgencySelection,
  removeAgencyInstall,
  resolveAgencyRunTarget,
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
        onDone(formatAgencyStatus(parsed.scope), { display: 'system' })
        return null

      case 'list':
        onDone(formatAgencyList(parsed.scope), { display: 'system' })
        return null

      case 'run': {
        const target = resolveAgencyRunTarget(parsed.target, parsed.scope)
        const nextInput = buildAgencyRunPrompt(target, parsed.task ?? '')
        onDone(
          `Launching ${target.entry.id} from ${target.manifest.scope} scope.`,
          {
            display: 'system',
            shouldQuery: true,
            nextInput,
            submitNextInput: true,
          },
        )
        return null
      }

      case 'update': {
        const result = await updateAgencyInstall(parsed.scope)
        clearAgentDefinitionsCache()

        const lines = [
          `Agency ${parsed.scope} update complete at ${result.manifest.installedCommit}.`,
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
        const result = await installAgencySelection(
          parsed.target,
          parsed.scope,
          parsed.ref,
        )
        clearAgentDefinitionsCache()

        const lines = [
          `Agency ${parsed.scope} install complete at ${result.manifest.installedCommit}.`,
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
        const result = removeAgencyInstall(parsed.target, parsed.scope)
        clearAgentDefinitionsCache()

        const lines = [
          `Agency ${parsed.scope} remove complete.`,
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
