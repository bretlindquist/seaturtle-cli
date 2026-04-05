import type { Command } from '../../commands.js'

const swim = {
  type: 'local-jsx',
  name: 'swim',
  description:
    'Run whimsical tracked-plan orchestration with the same explicit validation and commit gates',
  immediate: true,
  disableModelInvocation: true,
  userInvocable: true,
  load: () => import('./swim.js'),
} satisfies Command

export default swim
