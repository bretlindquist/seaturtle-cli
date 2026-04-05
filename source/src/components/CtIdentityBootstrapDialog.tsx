import React, { useState } from 'react'
import { overwriteProjectCtIdentityFiles } from '../services/projectIdentity/bootstrap.js'
import {
  markCtIdentityBootstrapComplete,
  markCtIdentityBootstrapSkipped,
  shouldUseSeaTurtleFallbackIntro,
} from '../services/projectIdentity/state.js'
import {
  buildGuidedCtIdentity,
  getBootstrapQuip,
  type CtIdentityFocusPreset,
  type CtIdentityRolePreset,
  type CtIdentityTonePreset,
} from '../services/projectIdentity/templates.js'
import { HALF_SHELL_ARCHIVES_NAME } from '../services/projectIdentity/lore.js'
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
            : 'Private CT identity for this project'}
        </Text>
        <Text>
          {useFallbackIntro
            ? 'I already started this project with a stock private `identity.md` and `soul.md` starter kit so we can keep moving.'
            : 'CT already created private starter files in `.ct/` and a tiny `CLAUDE.local.md` bridge for this project.'}
        </Text>
        <Text>
          {useFallbackIntro
            ? `Now we can either keep the stock SeaTurtle starter kit, or tune CT so this project gets its own voice, soul, and working posture. Later, this private layer can grow into ${HALF_SHELL_ARCHIVES_NAME}.`
            : `This is where we establish CT’s private identity and soul for this project. Want to tune it a little, keep the stock starter kit, or skip for now? Later, this private layer can grow into ${HALF_SHELL_ARCHIVES_NAME}.`}
        </Text>
        <Box>
          <Select
            options={
              useFallbackIntro
                ? [
                    {
                      label:
                        'Go with the stock SeaTurtle start kit, wield this power carefully.',
                      value: 'default',
                    },
                    {
                      label:
                        'Tune this SeaTurtle for your project, and unleash even more speed and power.',
                      value: 'guided',
                    },
                  ]
                : [
                    {
                      label:
                        'Tune this SeaTurtle for your project, and unleash even more speed and power.',
                      value: 'guided',
                    },
                    {
                      label:
                        'Go with the stock SeaTurtle start kit, wield this power carefully.',
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
          This shapes your private CT identity going forward. Pick the closest
          fit. We can keep it light and conversational.
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
        <Text>This tunes how I lean when the path isn&apos;t obvious.</Text>
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
        This shapes the voice in your private CT soul and identity files going
        forward.
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
