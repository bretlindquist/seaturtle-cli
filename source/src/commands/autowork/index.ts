import type { Command } from '../../commands.js'

const autowork = {
  type: 'local-jsx',
  name: 'autowork',
  description:
    'Run persistent tracked-plan orchestration with safe checkpoint gates, bounded runtime windows, and explicit verification',
  immediate: true,
  disableModelInvocation: true,
  userInvocable: true,
  load: () => import('./autowork.js'),
} satisfies Command

export default autowork
