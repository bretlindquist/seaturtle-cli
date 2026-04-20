import type { Command } from '../../commands.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

const feedback = {
  aliases: ['bug'],
  type: 'local-jsx',
  name: 'feedback',
  description: `Submit feedback about CT`,
  argumentHint: '[report]',
  isEnabled: () =>
    !(
      isEnvTruthy(process.env.DISABLE_FEEDBACK_COMMAND) ||
      isEnvTruthy(process.env.DISABLE_BUG_COMMAND)
    ),
  load: () => import('./feedback.js'),
} satisfies Command

export default feedback
