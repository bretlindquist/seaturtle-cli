import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from '../utils/config.js'

export type ProjectReminder = {
  text: string
  updatedAt?: number
}

function normalizeReminderText(input: string | undefined | null): string | null {
  if (typeof input !== 'string') {
    return null
  }

  const normalized = input.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : null
}

export function getProjectReminder(): ProjectReminder | null {
  const reminder = getCurrentProjectConfig().remindMe
  const text = normalizeReminderText(reminder?.text)

  if (!text) {
    return null
  }

  return {
    text,
    updatedAt: reminder?.updatedAt,
  }
}

export function saveProjectReminder(text: string): ProjectReminder {
  const normalized = normalizeReminderText(text)
  if (!normalized) {
    throw new Error('Reminder text cannot be empty')
  }

  const updatedAt = Date.now()

  saveCurrentProjectConfig(current => ({
    ...current,
    remindMe: {
      text: normalized,
      updatedAt,
    },
  }))

  return {
    text: normalized,
    updatedAt,
  }
}

export function clearProjectReminder(): boolean {
  const hadReminder = !!getProjectReminder()

  saveCurrentProjectConfig(current => {
    if (!current.remindMe) {
      return current
    }

    return {
      ...current,
      remindMe: undefined,
    }
  })

  return hadReminder
}

export function formatProjectReminderNoticeText(reminder: ProjectReminder): string {
  return `Reminder: ${reminder.text}`
}
