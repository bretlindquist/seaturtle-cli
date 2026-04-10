import {
  selectTipWithLongestTimeSinceShownUsing,
  shouldShowConfigHelpTip,
  shouldShowCopyMenuTip,
  shouldShowExecutionLanesTip,
  shouldShowProjectTodoCommandTip,
  shouldShowStatusDashboardTip,
  shouldShowTelegramSetupTip,
  shouldShowTranscriptSearchTip,
} from '../source/src/services/tips/ctFeatureDiscovery.js'
import type { Tip } from '../source/src/services/tips/types.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function createTip(id: string): Tip {
  return {
    id,
    content: async () => id,
    cooldownSessions: 0,
    isRelevant: async () => true,
  }
}

function run(): void {
  assert(
    shouldShowProjectTodoCommandTip({ todoFeatureEnabled: true }, false),
    'expected /todo discovery tip when todo feature is enabled and .ct/todo.md is absent',
  )
  assert(
    !shouldShowProjectTodoCommandTip({ todoFeatureEnabled: false }, false),
    'expected /todo discovery tip to stay off when the feature is disabled',
  )
  assert(
    !shouldShowProjectTodoCommandTip({ todoFeatureEnabled: true }, true),
    'expected /todo discovery tip to stay off when the project todo file already exists',
  )

  assert(
    shouldShowStatusDashboardTip({ numStartups: 3 }),
    'expected /status tip after the early startup warmup',
  )
  assert(
    shouldShowConfigHelpTip({ numStartups: 3 }),
    'expected /config tip after the early startup warmup',
  )
  assert(
    shouldShowTranscriptSearchTip({ numStartups: 4 }),
    'expected transcript search tip after startup warmup',
  )
  assert(
    shouldShowExecutionLanesTip({ numStartups: 4 }),
    'expected execution lanes tip after startup warmup',
  )
  assert(
    shouldShowCopyMenuTip({ copyCommandBehavior: 'showMenu' }),
    'expected /copy tip when the copy menu remains interactive',
  )
  assert(
    !shouldShowCopyMenuTip({ copyCommandBehavior: 'copyLatestResponse' }),
    'expected /copy tip to stay off when latest-response copying is the default',
  )
  assert(
    shouldShowTelegramSetupTip({ numStartups: 5 }, false),
    'expected Telegram setup tip when the project is not yet paired',
  )
  assert(
    !shouldShowTelegramSetupTip({ numStartups: 5 }, true),
    'expected Telegram setup tip to stay off once the project is paired',
  )

  const tips = [createTip('newer'), createTip('older'), createTip('middle')]
  const selected = selectTipWithLongestTimeSinceShownUsing(tips, tipId => {
    switch (tipId) {
      case 'older':
        return 12
      case 'middle':
        return 7
      default:
        return 3
    }
  })
  assert(
    selected?.id === 'older',
    'expected tip scheduler to deterministically choose the tip with the longest time since last shown',
  )
}

run()
