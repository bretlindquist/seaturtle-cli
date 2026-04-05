import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import type { ThemeSetting } from '../utils/theme.js'

export type LolcatMode = 'off' | 'static' | 'animated'

export type LolcatState = {
  mode: LolcatMode
  persistAnimation: boolean
  previousTheme?: ThemeSetting
}

const DEFAULT_LOLCAT_STATE: LolcatState = {
  mode: 'off',
  persistAnimation: false,
}

const listeners = new Set<(state: LolcatState) => void>()

function normalizeLolcatState(state: Partial<LolcatState> | undefined): LolcatState {
  return {
    mode: state?.mode ?? DEFAULT_LOLCAT_STATE.mode,
    persistAnimation:
      state?.persistAnimation ?? DEFAULT_LOLCAT_STATE.persistAnimation,
    previousTheme: state?.previousTheme,
  }
}

function getStoredLolcatState(): LolcatState {
  return normalizeLolcatState(getGlobalConfig().lolcat)
}

function emit(state: LolcatState): void {
  for (const listener of listeners) {
    listener(state)
  }
}

export function getLolcatState(): LolcatState {
  return getStoredLolcatState()
}

export function subscribeLolcatState(
  listener: (state: LolcatState) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function saveLolcatState(
  updater: (current: LolcatState) => LolcatState,
): LolcatState {
  const current = getStoredLolcatState()
  const next = normalizeLolcatState(updater(current))
  saveGlobalConfig(config => ({
    ...config,
    lolcat: next,
  }))
  emit(next)
  return next
}

function normalizePreviousTheme(
  currentTheme: ThemeSetting,
  existingPreviousTheme: ThemeSetting | undefined,
): ThemeSetting {
  if (currentTheme !== 'lolcat') {
    return currentTheme
  }
  return existingPreviousTheme ?? 'dark'
}

export function enableStaticLolcat(currentTheme: ThemeSetting): LolcatState {
  return saveLolcatState(current => ({
    mode: 'static',
    persistAnimation: false,
    previousTheme: normalizePreviousTheme(currentTheme, current.previousTheme),
  }))
}

export function enableAnimatedLolcat(
  currentTheme: ThemeSetting,
  persistAnimation = false,
): LolcatState {
  return saveLolcatState(current => ({
    mode: 'animated',
    persistAnimation,
    previousTheme: normalizePreviousTheme(currentTheme, current.previousTheme),
  }))
}

export function toggleAnimatedLolcatPersistence(
  currentTheme: ThemeSetting,
): LolcatState {
  const current = getStoredLolcatState()
  if (current.mode === 'animated' && current.persistAnimation) {
    return saveLolcatState(existing => ({
      ...existing,
      mode: 'animated',
      persistAnimation: false,
    }))
  }
  return enableAnimatedLolcat(currentTheme, true)
}

export function disableLolcat(): LolcatState {
  return saveLolcatState(current => ({
    mode: 'off',
    persistAnimation: false,
    previousTheme: current.previousTheme,
  }))
}

export function stopTransientLolcatAnimation(): LolcatState | null {
  const current = getStoredLolcatState()
  if (current.mode !== 'animated' || current.persistAnimation) {
    return null
  }
  return saveLolcatState(existing => ({
    ...existing,
    mode: 'static',
    persistAnimation: false,
  }))
}

export function getLolcatRestoreTheme(): ThemeSetting {
  return getStoredLolcatState().previousTheme ?? 'dark'
}
