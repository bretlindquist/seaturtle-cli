import type { LocalJSXCommandCall } from '../../types/command.js'
import { getCavemanMode, setCavemanMode } from '../../bootstrap/state.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'

type CavemanMode = 'off' | 'lite' | 'full' | 'ultra'

const MODE_ALIASES: Record<string, CavemanMode> = {
  off: 'off',
  normal: 'off',
  stop: 'off',
  disable: 'off',
  lite: 'lite',
  light: 'lite',
  full: 'full',
  on: 'full',
  ultra: 'ultra',
}

function buildSystemReminder(mode: CavemanMode): string {
  if (mode === 'off') {
    return `<system-reminder>\nCaveman mode is now off. Return to normal SeaTurtle voice and ordinary clarity.\n</system-reminder>`
  }

  return `<system-reminder>\nCaveman mode is now ${mode}. Use compressed user-facing text while preserving technical accuracy until the mode changes again.\n</system-reminder>`
}

function getModeSummary(mode: CavemanMode): string {
  switch (mode) {
    case 'off':
      return 'Caveman mode off. SeaTurtle speaking normally.'
    case 'lite':
      return 'Caveman mode lite. Tight sentences, no fluff.'
    case 'full':
      return 'Caveman mode full. Default caveman compression active.'
    case 'ultra':
      return 'Caveman mode ultra. Maximum compression active.'
  }
}

function parseModeArg(args: string | undefined): CavemanMode | undefined {
  const key = args?.trim().toLowerCase()
  if (!key) return 'full'
  return MODE_ALIASES[key]
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmedArgs = args?.trim().toLowerCase() ?? ''

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(
      'Use /caveman off, /caveman lite, /caveman full, or /caveman ultra.\n\nDefault: /caveman = full.\nStatusline shows [CAVEMAN] while active.',
      { display: 'system' },
    )
    return null
  }

  const requestedMode = parseModeArg(args)

  if (!requestedMode) {
    onDone(
      'Unknown caveman mode.\n\nUse /caveman off, /caveman lite, /caveman full, or /caveman ultra.',
      { display: 'system' },
    )
    return null
  }

  const currentMode = getCavemanMode()
  if (currentMode === requestedMode) {
    onDone(getModeSummary(currentMode), { display: 'system' })
    return null
  }

  setCavemanMode(requestedMode)
  onDone(getModeSummary(requestedMode), {
    display: 'system',
    metaMessages: [buildSystemReminder(requestedMode)],
  })
  return null
}
