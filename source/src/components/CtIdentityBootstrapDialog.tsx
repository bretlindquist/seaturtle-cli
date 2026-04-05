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
import {
  getBootstrapQuip,
  HALF_SHELL_ARCHIVES_NAME,
} from '../services/projectIdentity/lore.js'
import { Box, Text } from '../ink.js'
import { clearMemoryFileCaches } from '../utils/claudemd.js'
import { Select } from './CustomSelect/select.js'
import { getCurrentProjectConfig } from '../utils/config.js'

type Props = {
  onDone(): void
  mode?: 'startup' | 'retune'
}

type Screen = 'start' | 'role' | 'focus' | 'tone'

export function CtIdentityBootstrapDialog({
  onDone,
  mode = 'startup',
}: Props): React.ReactNode {
  const [screen, setScreen] = useState<Screen>(mode === 'retune' ? 'role' : 'start')
  const [role, setRole] = useState<CtIdentityRolePreset>('builder')
  const [focus, setFocus] = useState<CtIdentityFocusPreset>('speed')
  const useFallbackIntro =
    mode === 'startup' && shouldUseSeaTurtleFallbackIntro()
  const seenCount = getCurrentProjectConfig().ctIdentityBootstrap?.seenCount ?? 0
  const quip = getBootstrapQuip(Math.max(seenCount - 1, 0))

  function finishWithStarterDefaults(): void {
    clearMemoryFileCaches()
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
    clearMemoryFileCaches()
    markCtIdentityBootstrapComplete('guided')
    onDone()
  }

  if (screen === 'start') {
    return (
      <Box flexDirection="column" gap={1} paddingLeft={1}>
        <Text color="claude">{quip}</Text>
        <Text bold>
          {useFallbackIntro
            ? "I'm 🐢 SeaTurtle, or CT for short."
            : 'Let’s shape how CT should show up here.'}
        </Text>
        <Text>
          {useFallbackIntro
            ? 'I already set up a stock private starter kit in `.ct/` so we could keep moving.'
            : 'CT already created a private `.ct/` layer for this project, along with a tiny compatibility bridge.'}
        </Text>
        <Text>
          {useFallbackIntro
            ? `If you want, we can keep the stock SeaTurtle starter kit, or tune how I think, sound, and work in this project. Later, this private layer can grow into ${HALF_SHELL_ARCHIVES_NAME}.`
            : `This is a small first conversation, not a form. We can tune how I think, sound, and work in this project, keep the stock starter kit, or skip for now. Later, this private layer can grow into ${HALF_SHELL_ARCHIVES_NAME}.`}
        </Text>
        <Box>
          <Select
            options={
              useFallbackIntro
                ? [
                    {
                      label: 'Keep the stock SeaTurtle starter kit',
                      value: 'default',
                    },
                    {
                      label: 'Tune how SeaTurtle shows up here',
                      value: 'guided',
                    },
                  ]
                : [
                    {
                      label: 'Tune how SeaTurtle shows up here',
                      value: 'guided',
                    },
                    {
                      label: 'Keep the stock SeaTurtle starter kit',
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

              if (mode === 'startup') {
                markCtIdentityBootstrapSkipped()
              }
              onDone()
            }}
            onCancel={() => {
              if (useFallbackIntro) {
                finishWithStarterDefaults()
                return
              }

              if (mode === 'startup') {
                markCtIdentityBootstrapSkipped()
              }
              onDone()
            }}
          />
        </Box>
        <Text dimColor>
          {useFallbackIntro
            ? 'Enter to confirm · Esc keeps the stock SeaTurtle starter kit'
            : 'Enter to confirm · Esc skips for now'}
        </Text>
      </Box>
    )
  }

  if (screen === 'role') {
    return (
      <Box flexDirection="column" gap={1} paddingLeft={1}>
        <Text bold>What kind of SeaTurtle should I be in this project?</Text>
        <Text>
          We are not locking in a costume. We are just picking the closest
          working stance so this feels natural.
        </Text>
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
            onCancel={() => (mode === 'retune' ? onDone() : setScreen('start'))}
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
        <Text>This tunes how I lean when the path is still forming.</Text>
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
      <Text bold>How should I sound by default?</Text>
      <Text>
        This shapes the voice in the private CT layer going forward. We can keep
        it warm, playful, or cleaner without turning it into a persona stunt.
      </Text>
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
