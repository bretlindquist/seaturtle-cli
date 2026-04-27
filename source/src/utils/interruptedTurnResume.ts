import { randomUUID } from 'crypto'
import type { QueuedCommand } from 'src/types/textInputTypes.js'
import type { TurnInterruptionState } from 'src/utils/conversationRecovery.js'

export function buildInterruptedTurnResumeQueuedCommand(
  turnInterruptionState?: TurnInterruptionState,
): QueuedCommand | null {
  if (
    !turnInterruptionState ||
    turnInterruptionState.kind === 'none'
  ) {
    return null
  }

  return {
    mode: 'prompt',
    value: turnInterruptionState.message.message.content,
    uuid: randomUUID(),
    // Preserve hidden/system-generated resume semantics when the interrupted
    // prompt was synthesized as meta guidance during session recovery.
    isMeta: turnInterruptionState.message.isMeta || undefined,
    origin: turnInterruptionState.message.origin,
  }
}
