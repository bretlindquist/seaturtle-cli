import { clearProjectReminder } from '../../services/remindme.js'
import type { LocalCommandCall } from '../../types/command.js'

export const call: LocalCommandCall = async () => {
  const cleared = clearProjectReminder()

  return {
    type: 'text',
    value: cleared
      ? 'Cleared the end-of-response reminder.'
      : 'No end-of-response reminder was set.',
  }
}
