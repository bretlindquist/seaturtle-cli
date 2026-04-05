import type { Command } from '../../commands.js'

const game = {
  type: 'local-jsx',
  name: 'game',
  description: 'Hidden SeaTurtle game shell',
  isHidden: true,
  immediate: true,
  disableModelInvocation: true,
  userInvocable: true,
  load: () => import('./game.js'),
} satisfies Command

export default game
