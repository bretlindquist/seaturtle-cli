import {
  selectTipWithLongestTimeSinceShownUsing,
  shouldShowConfigHelpTip,
  shouldShowCopyMenuTip,
  shouldShowExecutionLanesTip,
  shouldShowOpenAiComputerUseTip,
  shouldShowOpenAiHostedFileSearchTip,
  shouldShowOpenAiHostedShellTip,
  shouldShowOpenAiImageGenerationTip,
  shouldShowOpenAiRemoteMcpTip,
  shouldShowOpenAiRuntimeDocsTip,
  shouldShowProjectTodoCommandTip,
  shouldShowStatusDashboardTip,
  shouldShowTelegramSetupTip,
  shouldShowTranscriptSearchTip,
} from '../source/src/services/tips/ctFeatureDiscovery.js'
import type { Tip } from '../source/src/services/tips/types.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
  const repoRoot = join(import.meta.dir, '..')
  const tipRegistry = readFileSync(
    join(repoRoot, 'source/src/services/tips/tipRegistry.ts'),
    'utf8',
  )

  assert(
    /isAntRuntimeEnabled\(\)/.test(tipRegistry),
    'expected user-facing tip gating to use the centralized ant runtime helper',
  )
  assert(
    /const internalOnlyTips: Tip\[] =\s*isBuildTimeAntUserType\(\)/.test(
      tipRegistry,
    ),
    'expected internal-only tips to remain build-time gated',
  )

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
  assert(
    shouldShowOpenAiRuntimeDocsTip({ execution: { family: 'openai' } }),
    'expected OpenAI runtime docs tip when the active runtime is OpenAI',
  )
  assert(
    shouldShowOpenAiHostedShellTip({
      execution: { family: 'openai' },
      supportsHostedShell: true,
    }),
    'expected hosted shell tip when OpenAI hosted shell is live',
  )
  assert(
    shouldShowOpenAiImageGenerationTip({
      execution: { family: 'openai' },
      supportsImageGeneration: true,
    }),
    'expected image generation tip when OpenAI image generation is live',
  )
  assert(
    shouldShowOpenAiComputerUseTip({
      execution: { family: 'openai' },
      supportsComputerUse: true,
    }),
    'expected computer use tip when OpenAI computer use is live',
  )
  assert(
    shouldShowOpenAiHostedFileSearchTip({
      execution: { family: 'openai' },
      hostedFileSearchConfigured: true,
      supportsHostedFileSearch: true,
    }),
    'expected hosted file search tip when vector stores are configured and file search is routed',
  )
  assert(
    shouldShowOpenAiRemoteMcpTip({
      execution: { family: 'openai' },
      supportsRemoteMcp: true,
    }),
    'expected remote MCP tip when the OpenAI remote MCP bridge is live',
  )
  assert(
    !shouldShowOpenAiHostedShellTip({
      execution: { family: 'anthropic' },
      supportsHostedShell: true,
    }),
    'expected OpenAI-specific tips to stay off on non-OpenAI runtimes',
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
