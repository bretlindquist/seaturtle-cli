import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { getCtArchives } from './archives.js'
import type { CtDisposition } from './conversationPosture.js'

export type HaikuStartupMode = 'off' | 'rare'

export type CtHaikuState = {
  startupMode: HaikuStartupMode
  lastShownAt?: number
}

export type CtHaiku = readonly [string, string, string]

const DEFAULT_HAIKU_STATE: CtHaikuState = {
  startupMode: 'off',
}

const STARTUP_HAIKU_COOLDOWN_MS = 1000 * 60 * 60 * 8

const HAIKU_POOL: readonly CtHaiku[] = [
  ['low tide after rain', 'one cursor blinks in the harbor', 'night keeps its counsel'],
  ['cedar after dusk', 'the terminal gathers starlight', 'keys cooling to blue'],
  ['snow against the glass', 'a branch writes once across the dark', 'the room listens in'],
  ['spring gutters run clear', 'small waves move under old streetlamps', 'the prompt waits its turn'],
  ['empty coffee cup', 'pale light along the monitor', 'morning without names'],
  ['summer thunder far', 'an unfinished line in the shell', 'swallows cut the rain'],
  ['moss on iron rails', 'a quiet build before sunrise', 'crows trade the weather'],
  ['autumn station air', 'logs thinning into silence', 'moon caught in puddles'],
  ['salt wind on wet stone', 'one thought turns beneath the lantern', 'the tide says nothing'],
  ['winter branch shadows', 'the screen holds a little dawn', 'breath near the window'],
] as const

function normalizeHaikuState(
  state: Partial<CtHaikuState> | undefined,
): CtHaikuState {
  return {
    startupMode: state?.startupMode ?? DEFAULT_HAIKU_STATE.startupMode,
    lastShownAt: state?.lastShownAt,
  }
}

function hashSeed(seed: string): number {
  let score = 0
  for (const char of seed) {
    score = (score * 33 + char.charCodeAt(0)) >>> 0
  }
  return score
}

export function getHaikuState(): CtHaikuState {
  return normalizeHaikuState(getGlobalConfig().haiku)
}

export function saveHaikuState(
  updater: (current: CtHaikuState) => CtHaikuState,
): CtHaikuState {
  const current = getHaikuState()
  const next = normalizeHaikuState(updater(current))
  saveGlobalConfig(config => ({
    ...config,
    haiku: next,
  }))
  return next
}

export function enableRareStartupHaiku(): CtHaikuState {
  return saveHaikuState(current => ({
    ...current,
    startupMode: 'rare',
  }))
}

export function disableStartupHaiku(): CtHaikuState {
  return saveHaikuState(current => ({
    ...current,
    startupMode: 'off',
  }))
}

export function markStartupHaikuShown(now: number = Date.now()): CtHaikuState {
  return saveHaikuState(current => ({
    ...current,
    lastShownAt: now,
  }))
}

export function pickCtHaiku(seed: string): CtHaiku {
  return HAIKU_POOL[hashSeed(seed) % HAIKU_POOL.length] ?? HAIKU_POOL[0]
}

function getCreativeRarePeriod(disposition: CtDisposition): number {
  switch (disposition) {
    case 'reflective':
      return 9
    case 'warm':
      return 10
    case 'curious':
      return 11
    default:
      return 12
  }
}

export function shouldShowStartupHaiku(input: {
  seed: string
  startupCount: number
  now?: number
  disposition: CtDisposition
}): boolean {
  const state = getHaikuState()
  if (state.startupMode !== 'rare') {
    return false
  }

  const now = input.now ?? Date.now()
  if (
    typeof state.lastShownAt === 'number' &&
    now - state.lastShownAt < STARTUP_HAIKU_COOLDOWN_MS
  ) {
    return false
  }

  const period = getCreativeRarePeriod(input.disposition)
  return hashSeed(`${input.seed}:${input.startupCount}`) % period === 0
}

export function getCtHaikuSummary(): string {
  const state = getHaikuState()
  return state.startupMode === 'rare'
    ? 'Rare startup haiku is enabled.'
    : 'Startup haiku is off.'
}

export function getCtHaikuDisplay(seed: string): string {
  const archives = getCtArchives()
  const dispositionSeed = `${seed}:${archives.temperament.join('/')}`
  return pickCtHaiku(dispositionSeed).join('\n')
}
