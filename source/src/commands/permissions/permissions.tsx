import * as React from 'react'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import type {
  CommandResultDisplay,
  LocalJSXCommandCall,
  LocalJSXCommandContext,
} from '../../types/command.js'
import { createPermissionRetryMessage } from '../../utils/messages.js'
import {
  permissionModeTitle,
  type PermissionMode,
} from '../../utils/permissions/PermissionMode.js'
import { PermissionRuleList } from '../../components/permissions/rules/PermissionRuleList.js'

type PermissionsTab = 'recent' | 'allow' | 'ask' | 'deny' | 'workspace'
type PermissionMenuAction = PermissionsTab | 'back'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

function parsePermissionsTab(args: string): PermissionsTab | null {
  const normalized = args.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  switch (normalized) {
    case 'recent':
    case 'recent-denials':
    case 'denials':
      return 'recent'
    case 'allow':
    case 'allowed':
    case 'rules':
      return 'allow'
    case 'ask':
      return 'ask'
    case 'deny':
    case 'denied':
      return 'deny'
    case 'workspace':
    case 'directories':
    case 'dirs':
      return 'workspace'
    default:
      return null
  }
}

function getPermissionsHelpText(): string {
  return [
    'Use /permissions to review permission rules, recent denials, and workspace directories.',
    '',
    'Shortcuts:',
    '- /permissions recent',
    '- /permissions allow',
    '- /permissions ask',
    '- /permissions deny',
    '- /permissions workspace',
  ].join('\n')
}

function PermissionsMenu({
  currentMode,
  onDone,
  onSelectTab,
}: {
  currentMode: PermissionMode
  onDone: OnDone
  onSelectTab: (tab: PermissionsTab) => void
}): React.ReactNode {
  return (
    <Dialog
      title="Permissions"
      subtitle="Review permission rules, recent denials, and workspace directories from one surface."
      onCancel={() =>
        onDone('Permissions menu dismissed', {
          display: 'system',
        })
      }
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>Current mode:</Text>
          <Text dimColor>{permissionModeTitle(currentMode)}</Text>
        </Box>
        <Select
          options={[
            {
              label: 'Recent denials',
              value: 'recent' as const,
              description:
                'Review commands denied by the auto mode classifier and retry them when appropriate',
            },
            {
              label: 'Allow rules',
              value: 'allow' as const,
              description:
                'Review or remove always-allow permission rules',
            },
            {
              label: 'Ask rules',
              value: 'ask' as const,
              description:
                'Review rules that force explicit approval prompts',
            },
            {
              label: 'Deny rules',
              value: 'deny' as const,
              description:
                'Review or remove always-deny permission rules',
            },
            {
              label: 'Workspace directories',
              value: 'workspace' as const,
              description:
                'Manage additional working directories and workspace scope',
            },
            {
              label: 'Back',
              value: 'back' as const,
              description: 'Return to the conversation',
            },
          ]}
          onChange={(value: PermissionMenuAction) => {
            if (value === 'back') {
              onDone('Permissions menu dismissed', { display: 'system' })
              return
            }

            onSelectTab(value)
          }}
          onCancel={() =>
            onDone('Permissions menu dismissed', {
              display: 'system',
            })
          }
        />
      </Box>
    </Dialog>
  )
}

function PermissionsShell({
  context,
  initialTab,
  onDone,
}: {
  context: LocalJSXCommandContext
  initialTab: PermissionsTab | null
  onDone: OnDone
}): React.ReactNode {
  const [selectedTab, setSelectedTab] = React.useState<PermissionsTab | null>(
    initialTab,
  )
  const currentMode = context.getAppState().toolPermissionContext.mode

  if (selectedTab) {
    return (
      <PermissionRuleList
        initialTab={selectedTab}
        onExit={() => setSelectedTab(null)}
        onRetryDenials={commands => {
          context.setMessages(prev => [
            ...prev,
            createPermissionRetryMessage(commands),
          ])
        }}
      />
    )
  }

  return (
    <PermissionsMenu
      currentMode={currentMode}
      onDone={onDone}
      onSelectTab={setSelectedTab}
    />
  )
}

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const trimmedArgs = args?.trim() || ''

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(getPermissionsHelpText(), { display: 'system' })
    return null
  }

  const initialTab = parsePermissionsTab(trimmedArgs)
  if (trimmedArgs.length > 0 && !initialTab) {
    onDone(
      [
        `Unknown /permissions option: ${trimmedArgs}`,
        '',
        getPermissionsHelpText(),
      ].join('\n'),
      { display: 'system' },
    )
    return null
  }

  return (
    <PermissionsShell
      context={context}
      initialTab={initialTab}
      onDone={onDone}
    />
  )
}
