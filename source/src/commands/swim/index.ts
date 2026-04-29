import type { Command } from '../../commands.js'

const swim = {
  type: 'local-jsx',
  name: 'swim',
  description:
    'Run the whimsical alias for persistent tracked-plan orchestration with the same bounded windows and verification gates',
  immediate: true,
  disableModelInvocation: true,
  userInvocable: true,
  load: () => import('./swim.js'),
} satisfies Command

export default swim
