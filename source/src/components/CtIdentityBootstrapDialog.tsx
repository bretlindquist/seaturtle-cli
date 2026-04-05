import React, { useState } from 'react'
import { overwriteProjectCtIdentityFiles } from '../services/projectIdentity/bootstrap.js'
import {
  markCtIdentityBootstrapComplete,
  markCtIdentityBootstrapSkipped,
  shouldUseSeaTurtleFallbackIntro,
} from '../services/projectIdentity/state.js'
import {
  buildGuidedCtIdentity,
  type CtIdentityFocusPreset,
  type CtIdentityRolePreset,
  type CtIdentityTonePreset,
} from '../services/projectIdentity/templates.js'
import { Box, Text } from '../ink.js'
import { Select } from './CustomSelect/select.js'

type Props = {
  onDone(): void
}

type Screen = 'start' | 'role' | 'focus' | 'tone'

export function CtIdentityBootstrapDialog({ onDone }: Props): React.ReactNode {
  const [screen, setScreen] = useState<Screen>('start')
  const [role, setRole] = useState<CtIdentityRolePreset>('builder')
  const [focus, setFocus] = useState<CtIdentityFocusPreset>('speed')
  const useFallbackIntro = shouldUseSeaTurtleFallbackIntro()

  function finishWithStarterDefaults(): void {
    markCtIdentityBootstrapComplete('defaulted')
    onDone()
  }

  function finishGuidedCustomization(tone: CtIdentityTonePreset): void {
    const guided = buildGuidedCtIdentity({
      role,
      focus,
      tone,
    })
    overwriteProjectCtIdentityFiles(guided)
    markCtIdentityBootstrapComplete('guided')
    onDone()
  }

  if (screen === 'start') {
    return (
      <Box flexDirection="column" gap={1} paddingLeft={1}>
        <Text bold>
          {useFallbackIntro
            ? "I'm 🐢 SeaTurtle, or CT for short."
            : 'Private CT identity for this project'}
        </Text>
        <Text>
          {useFallbackIntro
            ? 'I already set up starter private identity files for this project so we can keep moving.'
            : 'CT already created private starter files in `.ct/` and a tiny `CLAUDE.local.md` bridge for this project.'}
        </Text>
        <Text>
          {useFallbackIntro
            ? 'You can keep the starter SeaTurtle defaults, or tune CT for this project now.'
            : 'Want to tune CT a little, keep the starter SeaTurtle defaults, or skip for now?'}
        </Text>
        <Box>
          <Select
            options={
              useFallbackIntro
                ? [
                    {
                      label: 'Keep the SeaTurtle starter for now',
                      value: 'default',
                    },
                    {
                      label: 'Tune CT for this project',
                      value: 'guided',
                    },
                  ]
                : [
                    {
                      label: 'Tune CT for this project',
                      value: 'guided',
                    },
                    {
                      label: 'Keep the SeaTurtle starter for now',
                      value: 'default',
                    },
                    {
                      label: 'Skip for now',
                      value: 'skip',
                    },
                  ]
            }
            onChange={value => {
              if (value === 'guided') {
                setScreen('role')
                return
              }

              if (value === 'default') {
                finishWithStarterDefaults()
                return
              }

              markCtIdentityBootstrapSkipped()
              onDone()
            }}
            onCancel={() => {
              if (useFallbackIntro) {
                finishWithStarterDefaults()
                return
              }

              markCtIdentityBootstrapSkipped()
              onDone()
            }}
          />
        </Box>
        <Text dimColor>
          {useFallbackIntro
            ? 'Enter to confirm · Esc keeps the SeaTurtle starter'
            : 'Enter to confirm · Esc skips for now'}
        </Text>
      </Box>
    )
  }

  if (screen === 'role') {
    return (
      <Box flexDirection="column" gap={1} paddingLeft={1}>
        <Text bold>What role should CT lean into here?</Text>
        <Text>Pick the closest fit. We can keep this simple.</Text>
        <Box>
          <Select
            options={[
              {
                label: 'Pragmatic builder',
                value: 'builder',
                description: 'Implementation-first once the path is clear.',
              },
              {
                label: 'Research planner',
                value: 'planner',
                description: 'Investigate first and build surgical plans.',
              },
              {
                label: 'Thoughtful reviewer',
                value: 'reviewer',
                description: 'Spot risks, regressions, and gaps early.',
              },
              {
                label: 'Warm operator',
                value: 'operator',
                description: 'Keep the project oriented and moving calmly.',
              },
            ]}
            onChange={value => {
              setRole(value as CtIdentityRolePreset)
              setScreen('focus')
            }}
            onCancel={() => setScreen('start')}
          />
        </Box>
        <Text dimColor>Enter to confirm · Esc to go back</Text>
      </Box>
    )
  }

  if (screen === 'focus') {
    return (
      <Box flexDirection="column" gap={1} paddingLeft={1}>
        <Text bold>What should CT optimize for first?</Text>
        <Text>This sets the default posture, not a permanent rule.</Text>
        <Box>
          <Select
            options={[
              {
                label: 'Speed',
                value: 'speed',
                description: 'Short feedback loops and quick progress.',
              },
              {
                label: 'Polish',
                value: 'polish',
                description: 'Finish quality and cleaner edges.',
              },
              {
                label: 'Caution',
                value: 'caution',
                description: 'Safety, truthfulness, and reversibility.',
              },
              {
                label: 'Experimentation',
                value: 'experimentation',
                description: 'Fast learning and contained tests.',
              },
            ]}
            onChange={value => {
              setFocus(value as CtIdentityFocusPreset)
              setScreen('tone')
            }}
            onCancel={() => setScreen('role')}
          />
        </Box>
        <Text dimColor>Enter to confirm · Esc to go back</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1} paddingLeft={1}>
      <Text bold>How should CT sound by default?</Text>
      <Text>Keep it human. You can always rewrite the files later.</Text>
      <Box>
        <Select
          options={[
            {
              label: 'Lightly playful',
              value: 'lightly-playful',
              description: 'Kind, a little playful, never performative.',
            },
            {
              label: 'Warm and calm',
              value: 'warm-calm',
              description: 'Grounded, kind, and unhurried.',
            },
            {
              label: 'Straightforward',
              value: 'straightforward',
              description: 'Cleaner and lower-fluff, still human.',
            },
          ]}
          onChange={value =>
            finishGuidedCustomization(value as CtIdentityTonePreset)
          }
          onCancel={() => setScreen('focus')}
        />
      </Box>
      <Text dimColor>Enter to confirm · Esc to go back</Text>
    </Box>
  )
}
