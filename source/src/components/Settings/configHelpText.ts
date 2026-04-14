import type { PermissionMode } from '../../utils/permissions/PermissionMode.js'

export type ConfigHelpSetting = {
  id: string
  value?: string
  helpText?: string
}

export function getPermissionModeHelpText(mode: PermissionMode): string {
  switch (mode) {
    case 'default':
      return 'Prompt for higher-risk actions. Good default for normal interactive use.'
    case 'acceptEdits':
      return 'Apply file edits without asking first, but still prompt for other dangerous actions.'
    case 'bypassPermissions':
      return 'Full access. Never ask for permission prompts and run tools immediately.'
    case 'plan':
      return 'Planning only. CT can inspect context and reason, but it should not execute real tools.'
    case 'dontAsk':
      return "Never prompt. Anything not already allowed is denied, so this is quieter but more restrictive."
    case 'auto':
      return 'Let CT choose when to use a safer automatic mode during planning and execution.'
    default:
      return ''
  }
}

export function getConfigHelpText(setting: ConfigHelpSetting): string {
  switch (setting.id) {
    case 'autoCompactEnabled':
      return 'Automatically compact long conversations before the context window gets tight.'
    case 'spinnerTipsEnabled':
      return 'Show rotating usage tips while CT is thinking or waiting on tools.'
    case 'prefersReducedMotion':
      return 'Reduce animations and motion-heavy UI cues in the terminal.'
    case 'thinkingEnabled':
      return 'Allow extra reasoning before answering. Usually slower, often better for harder tasks.'
    case 'fastMode':
      return 'Prefer the faster response path when the current model supports it.'
    case 'promptSuggestionEnabled':
      return 'Offer suggested next prompts based on the current conversation.'
    case 'speculationEnabled':
      return 'Precompute likely next steps to make follow-up actions feel faster.'
    case 'fileCheckpointingEnabled':
      return 'Keep reversible checkpoints for file edits so changes are safer to inspect and undo.'
    case 'simulateAntRuntime':
      return 'Testing override. Simulates ant-only runtime gate checks where this external build can still honor them. It does not enable compile-time ant-only features.'
    case 'forceChicagoGate':
      return 'Testing override. Forces the local Chicago computer-use gate on so you can test computer-use availability in SeaTurtle.'
    case 'verbose':
      return 'Show more operational detail from CT while it works.'
    case 'terminalProgressBarEnabled':
      return 'Render a progress bar in terminal contexts that support it.'
    case 'showStatusInTerminalTab':
      return 'Mirror CT status details in the terminal tab view when available.'
    case 'showTurnDuration':
      return 'Show how long each completed turn took.'
    case 'defaultPermissionMode':
      return getPermissionModeHelpText((setting.value ?? 'default') as PermissionMode)
    case 'useAutoModeDuringPlan':
      return 'When planning, let CT use auto mode behavior instead of staying purely manual.'
    case 'respectGitignore':
      return 'Hide ignored files from CT file pickers unless you explicitly target them.'
    case 'copyFullResponse':
      return 'Legacy copy behavior toggle.'
    case 'copyCommandBehavior':
      return setting.value === 'copyLatestResponse'
        ? 'Skip the /copy menu and immediately copy the latest full assistant response.'
        : 'Always open the /copy menu so you can choose the latest response or a code block.'
    case 'copyOnSelect':
      return 'Copy selected terminal text to the clipboard automatically.'
    case 'autoUpdatesChannel':
      return 'Choose whether updates track the latest releases or the more conservative stable channel.'
    case 'theme':
      return 'Change the terminal color theme used by CT.'
    case 'notifChannel':
      return 'Choose where CT sends completion and attention notifications.'
    case 'taskCompleteNotifEnabled':
      return 'Notify when a task finishes.'
    case 'inputNeededNotifEnabled':
      return 'Notify when CT is blocked and needs your input.'
    case 'agentPushNotifEnabled':
      return 'Notify when agent activity needs attention.'
    case 'outputStyle':
      return 'Change how CT phrases and formats its responses.'
    case 'defaultView':
      return 'Choose whether CT opens in the standard chat view or the transcript-oriented view by default.'
    case 'language':
      return 'Set the preferred language for CT responses and interface copy where supported.'
    case 'editorMode':
      return 'Choose how CT interacts with your editor integration.'
    case 'prStatusFooterEnabled':
      return 'Show pull request status details in the footer when available.'
    case 'model':
      return 'Select the default main model for the active session.'
    case 'diffTool':
      return 'Choose which diff viewer CT uses when showing changes.'
    case 'autoConnectIde':
      return 'Automatically connect to a compatible IDE integration when one is available.'
    case 'autoInstallIdeExtension':
      return 'Automatically offer or install the IDE extension when CT detects support.'
    case 'claudeInChromeDefaultEnabled':
      return 'Enable the browser companion integration by default when that feature is available.'
    case 'teammateMode':
      return 'Choose how teammate agents participate when multi-agent features are enabled.'
    case 'teammateDefaultModel':
      return 'Default model used for newly spawned teammate agents.'
    case 'remoteControlAtStartup':
      return 'Control whether remote-control features are available as soon as CT starts.'
    case 'showExternalIncludesDialog':
      return 'Review and manage external includes used by project memory files.'
    case 'apiKey':
      return 'Use a custom API key path instead of the default auth flow for supported runtimes.'
    default:
      return setting.helpText ?? ''
  }
}
