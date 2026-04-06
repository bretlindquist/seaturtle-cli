import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type MermaidAction =
  | 'project'
  | 'focus'
  | 'flow'
  | 'journey'
  | 'update'
  | 'explain'
  | 'back'

function formatStubResult(action: Exclude<MermaidAction, 'back'>): string {
  switch (action) {
    case 'project':
      return [
        'Mermaid project map selected.',
        '',
        'This mode is for a durable high-level architecture doc for the repo.',
        'Next chunk: inspect the repo, choose the right Mermaid type, and write a markdown doc under docs/.',
      ].join('\n')
    case 'focus':
      return [
        'Mermaid focused map selected.',
        '',
        'This mode is for one feature, file, folder, or service slice.',
        'Next chunk: gather repo evidence for the requested slice and turn it into a tighter Mermaid doc.',
      ].join('\n')
    case 'flow':
      return [
        'Mermaid flow map selected.',
        '',
        'This mode is for runtime, command, or request flow.',
        'Next chunk: inspect the relevant entrypoint or command path and generate a readable flow diagram.',
      ].join('\n')
    case 'journey':
      return [
        'Mermaid user journey map selected.',
        '',
        'This mode is for the user path through a feature, not just the system internals.',
        'Next chunk: map one concrete user journey and write it as a durable Mermaid journey doc.',
      ].join('\n')
    case 'update':
      return [
        'Mermaid doc update selected.',
        '',
        'This mode is for refreshing an existing Mermaid markdown doc instead of creating a new one.',
        'Next chunk: discover existing Mermaid docs, let you choose one, and update it surgically.',
      ].join('\n')
    case 'explain':
      return [
        'Mermaid docs explainer selected.',
        '',
        'This mode will list Mermaid docs already in the repo and explain what each one covers.',
        'Next chunk: scan docs/, detect Mermaid blocks, and surface the current architecture map cleanly.',
      ].join('\n')
  }
}

function normalizeArg(value: string): string {
  return value.trim().toLowerCase()
}

function MermaidMenu({ onDone }: { onDone: OnDone }): React.ReactNode {
  return (
    <Dialog
      title="Mermaid"
      subtitle="Turn project structure, flow, and user journeys into durable Mermaid docs."
      onCancel={() => onDone('Mermaid menu dismissed', { display: 'system' })}
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>Mermaid is for thinking, not decoration.</Text>
          <Text dimColor>
            The goal is a readable markdown doc backed by repo evidence.
          </Text>
        </Box>
        <Select
          options={[
            {
              label: 'Project map',
              value: 'project' as const,
              description: 'Generate a high-level architecture doc for the repo',
            },
            {
              label: 'Focused map',
              value: 'focus' as const,
              description: 'Map one feature, service, file, or folder',
            },
            {
              label: 'Flow map',
              value: 'flow' as const,
              description: 'Trace a command, runtime path, or request flow',
            },
            {
              label: 'User journey map',
              value: 'journey' as const,
              description: 'Map the user path through a feature or experience',
            },
            {
              label: 'Update existing Mermaid doc',
              value: 'update' as const,
              description: 'Refresh an existing Mermaid markdown doc',
            },
            {
              label: 'Explain Mermaid docs',
              value: 'explain' as const,
              description: 'List the Mermaid docs already present in the repo',
            },
            {
              label: 'Back',
              value: 'back' as const,
              description: 'Return to the conversation',
            },
          ]}
          onChange={(value: MermaidAction) => {
            if (value === 'back') {
              onDone('Mermaid menu dismissed', { display: 'system' })
              return
            }
            onDone(formatStubResult(value), { display: 'system' })
          }}
          onCancel={() => onDone('Mermaid menu dismissed', { display: 'system' })}
        />
      </Box>
    </Dialog>
  )
}

function MermaidCommandRouter({
  onDone,
  arg,
}: {
  onDone: OnDone
  arg: string
}): React.ReactNode {
  if (arg === '') {
    return <MermaidMenu onDone={onDone} />
  }

  if (arg === 'project' || arg === 'architecture') {
    onDone(formatStubResult('project'), { display: 'system' })
    return null
  }

  if (arg.startsWith('focus') || arg.startsWith('focused')) {
    onDone(formatStubResult('focus'), { display: 'system' })
    return null
  }

  if (arg.startsWith('flow')) {
    onDone(formatStubResult('flow'), { display: 'system' })
    return null
  }

  if (arg.startsWith('journey')) {
    onDone(formatStubResult('journey'), { display: 'system' })
    return null
  }

  if (arg.startsWith('update') || arg.startsWith('refresh')) {
    onDone(formatStubResult('update'), { display: 'system' })
    return null
  }

  if (arg === 'docs' || arg === 'explain' || arg === 'help-docs') {
    onDone(formatStubResult('explain'), { display: 'system' })
    return null
  }

  onDone(
    [
      'Unknown mermaid option.',
      '',
      'Use /mermaid for the menu, or one of:',
      '- /mermaid project',
      '- /mermaid focus <path-or-feature>',
      '- /mermaid flow <path-or-feature>',
      '- /mermaid journey <feature>',
      '- /mermaid update <existing-doc>',
      '- /mermaid explain',
    ].join('\n'),
    { display: 'system' },
  )
  return null
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmedArgs = normalizeArg(args || '')

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(
      [
        'Run /mermaid for the menu.',
        '',
        'Fast paths:',
        '- /mermaid project',
        '- /mermaid focus <path-or-feature>',
        '- /mermaid flow <path-or-feature>',
        '- /mermaid journey <feature>',
        '- /mermaid update <existing-doc>',
        '- /mermaid explain',
      ].join('\n'),
      { display: 'system' },
    )
    return null
  }

  return <MermaidCommandRouter onDone={onDone} arg={trimmedArgs} />
}
