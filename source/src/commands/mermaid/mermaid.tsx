import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { getCtProjectRoot } from '../../services/projectIdentity/paths.js'
import {
  getMermaidSuggestions,
  scanMermaidRepo,
} from '../../services/mermaid/scan.js'
import { writeMermaidPlan } from '../../services/mermaid/generator.js'
import { planMermaid } from '../../services/mermaid/planner.js'
import type {
  MermaidExistingDoc,
  MermaidRequest,
} from '../../services/mermaid/types.js'

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

type Screen = 'menu' | 'pick-focus' | 'pick-flow' | 'pick-journey' | 'pick-update'

function parseMermaidRequest(rawArg: string): MermaidRequest {
  const trimmed = rawArg.trim()
  if (!trimmed) {
    return { intent: 'project' }
  }

  const [rawIntent, ...rest] = trimmed.split(/\s+/)
  const intent = rawIntent.toLowerCase()
  const target = rest.join(' ').trim() || undefined

  switch (intent) {
    case 'project':
    case 'architecture':
      return { intent: 'project', target }
    case 'focus':
    case 'focused':
      return { intent: 'focus', target }
    case 'flow':
      return { intent: 'flow', target }
    case 'journey':
      return { intent: 'journey', target }
    case 'update':
    case 'refresh':
      return { intent: 'update', target }
    case 'docs':
    case 'explain':
    case 'help-docs':
      return { intent: 'explain', target }
    default:
      return { intent: 'focus', target: trimmed }
  }
}

function formatExplainResult(docs: MermaidExistingDoc[]): string {
  if (docs.length === 0) {
    return 'No Mermaid docs were found under docs/ or docs/internal/.'
  }

  return [
    'Current Mermaid docs:',
    '',
    ...docs.map(doc => `- ${doc.path} — ${doc.title}`),
  ].join('\n')
}

function runMermaidRequest(request: MermaidRequest, onDone: OnDone): void {
  const root = getCtProjectRoot()
  const evidence = scanMermaidRepo(request, root)
  const plan = planMermaid(request, evidence)

  if (request.intent === 'explain') {
    onDone(formatExplainResult(evidence.existingDocs), { display: 'system' })
    return
  }

  const fullPath = writeMermaidPlan(plan, root)
  onDone(
    [
      `${plan.title} written.`,
      '',
      `Path: ${plan.outputPath}`,
      '',
      plan.summary,
      '',
      `Full path: ${fullPath}`,
    ].join('\n'),
    { display: 'system' },
  )
}

function MermaidMenu({
  onDone,
}: {
  onDone: OnDone
}): React.ReactNode {
  const [screen, setScreen] = React.useState<Screen>('menu')
  const suggestions = React.useMemo(() => getMermaidSuggestions(), [])

  if (screen === 'pick-focus') {
    return (
      <Dialog
        title="Focused Mermaid map"
        subtitle="Pick a feature or slice to map."
        onCancel={() => setScreen('menu')}
      >
        <Select
          options={[
            ...suggestions.focusTargets.map(target => ({
              label: target,
              value: target,
              description: `Generate a focused map for ${target}`,
            })),
            {
              label: 'Back',
              value: '__back__',
              description: 'Return to the Mermaid menu',
            },
          ]}
          onChange={value => {
            if (value === '__back__') {
              setScreen('menu')
              return
            }
            runMermaidRequest({ intent: 'focus', target: value }, onDone)
          }}
          onCancel={() => setScreen('menu')}
        />
      </Dialog>
    )
  }

  if (screen === 'pick-flow') {
    return (
      <Dialog
        title="Mermaid flow map"
        subtitle="Pick a runtime or command flow to trace."
        onCancel={() => setScreen('menu')}
      >
        <Select
          options={[
            ...suggestions.flowTargets.map(target => ({
              label: target,
              value: target,
              description: `Generate a flow map for ${target}`,
            })),
            {
              label: 'Back',
              value: '__back__',
              description: 'Return to the Mermaid menu',
            },
          ]}
          onChange={value => {
            if (value === '__back__') {
              setScreen('menu')
              return
            }
            runMermaidRequest({ intent: 'flow', target: value }, onDone)
          }}
          onCancel={() => setScreen('menu')}
        />
      </Dialog>
    )
  }

  if (screen === 'pick-journey') {
    return (
      <Dialog
        title="Mermaid user journey"
        subtitle="Pick a feature experience to map from the user's point of view."
        onCancel={() => setScreen('menu')}
      >
        <Select
          options={[
            ...suggestions.journeyTargets.map(target => ({
              label: target,
              value: target,
              description: `Generate a user journey map for ${target}`,
            })),
            {
              label: 'Back',
              value: '__back__',
              description: 'Return to the Mermaid menu',
            },
          ]}
          onChange={value => {
            if (value === '__back__') {
              setScreen('menu')
              return
            }
            runMermaidRequest({ intent: 'journey', target: value }, onDone)
          }}
          onCancel={() => setScreen('menu')}
        />
      </Dialog>
    )
  }

  if (screen === 'pick-update') {
    return (
      <Dialog
        title="Update Mermaid doc"
        subtitle="Pick an existing Mermaid markdown doc to refresh."
        onCancel={() => setScreen('menu')}
      >
        <Select
          options={[
            ...suggestions.updateTargets.map(target => ({
              label: target,
              value: target,
              description: `Regenerate ${target} from current repo evidence`,
            })),
            {
              label: 'Back',
              value: '__back__',
              description: 'Return to the Mermaid menu',
            },
          ]}
          onChange={value => {
            if (value === '__back__') {
              setScreen('menu')
              return
            }
            runMermaidRequest({ intent: 'update', target: value }, onDone)
          }}
          onCancel={() => setScreen('menu')}
        />
      </Dialog>
    )
  }

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
            switch (value) {
              case 'project':
                runMermaidRequest({ intent: 'project' }, onDone)
                return
              case 'focus':
                setScreen('pick-focus')
                return
              case 'flow':
                setScreen('pick-flow')
                return
              case 'journey':
                setScreen('pick-journey')
                return
              case 'update':
                setScreen('pick-update')
                return
              case 'explain':
                runMermaidRequest({ intent: 'explain' }, onDone)
                return
              case 'back':
                onDone('Mermaid menu dismissed', { display: 'system' })
                return
            }
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
  if (arg.trim() === '') {
    return <MermaidMenu onDone={onDone} />
  }

  const request = parseMermaidRequest(arg)
  runMermaidRequest(request, onDone)
  return null
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const rawArgs = args?.trim() || ''
  const normalizedHead = rawArgs.toLowerCase()

  if (COMMON_HELP_ARGS.includes(normalizedHead)) {
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

  return <MermaidCommandRouter onDone={onDone} arg={rawArgs} />
}
