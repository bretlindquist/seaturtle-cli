import type { Command } from '../../commands.js'

const autowork = {
  type: 'local-jsx',
  name: 'autowork',
  description:
    'Run safe tracked-plan orchestration one checkpoint at a time, with explicit validation and commit gates',
  immediate: true,
  disableModelInvocation: true,
  userInvocable: true,
  load: () => import('./autowork.js'),
} satisfies Command

export default autowork
