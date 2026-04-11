import type { Command } from '../../commands.js'

const remindmeclear = {
  type: 'local',
  name: 'remindmeclear',
  aliases: ['rmc'],
  description: 'Clear the current end-of-response reminder',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => import('./remindmeclear.js'),
} satisfies Command

export default remindmeclear
