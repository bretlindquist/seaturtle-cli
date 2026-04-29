import type { Command } from '../../commands.js'

const permissions = {
  type: 'local-jsx',
  name: 'permissions',
  aliases: ['allowed-tools'],
  description:
    'Review permission rules, recent denials, workspace directories, and the current permission posture',
  argumentHint: '[recent|allow|ask|deny|workspace]',
  load: () => import('./permissions.js'),
} satisfies Command

export default permissions
