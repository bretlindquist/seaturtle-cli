import { dirname } from 'path'
import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { getRelativeMemoryPath } from '../../components/memory/MemoryUpdateNotification.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { clearMemoryFileCaches } from '../../utils/claudemd.js'
import { editFileInEditor } from '../../utils/promptEditor.js'
import {
  ensureCtGlobalDefaultFile,
  ensureProjectCtIdentityBootstrap,
  getActiveCtDefaults,
  resetCtGlobalDefaultsToShipped,
  resetProjectCtIdentityToActiveDefaults,
} from '../../services/projectIdentity/bootstrap.js'
import {
  getCtArchiveSummary,
  getCtCanonCallback,
} from '../../services/projectIdentity/canonCallbacks.js'
import { CtIdentityBootstrapDialog } from '../../components/CtIdentityBootstrapDialog.js'
import { getProjectCtIdentityBootstrapState, markCtIdentityBootstrapComplete } from '../../services/projectIdentity/state.js'
import {
  getCtGlobalIdentityOverridePath,
  getCtGlobalSoulOverridePath,
  getCtBootstrapPath,
  getCtIdentityPath,
  getCtProjectRoot,
  getCtRolePath,
  getCtSessionPath,
  getCtSoulPath,
  getCtUserPath,
} from '../../services/projectIdentity/paths.js'

type OnExit = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type Screen = 'overview' | 'retune' | 'confirm-reset-project' | 'confirm-reset-global'

type Action =
  | 'edit-identity'
  | 'edit-soul'
  | 'edit-role'
  | 'edit-user'
  | 'edit-bootstrap'
  | 'edit-session'
  | 'retune'
  | 'reset-project'
  | 'edit-global-identity'
  | 'edit-global-soul'
  | 'reset-global'

function ensureFileExists(path: string, content: string): void {
  const fs = getFsImplementation()
  fs.mkdirSync(dirname(path))
  if (!fs.existsSync(path)) {
    writeFileSyncAndFlush_DEPRECATED(path, content, { encoding: 'utf-8' })
  }
}

function openCtFile(params: {
  path: string
  initialContent: string
  onExit: OnExit
  successPrefix: string
  nextStep: string
  onSuccess?: () => void
}): void {
  ensureFileExists(params.path, params.initialContent)
  const result = editFileInEditor(params.path)
  clearMemoryFileCaches()

  if (result.error) {
    params.onExit(result.error, { display: 'system' })
    return
  }

  if (result.content === null) {
    params.onExit(
      `No external editor is configured yet. Set $EDITOR or $VISUAL, then reopen ${getRelativeMemoryPath(params.path)}.\n\nNext: ${params.nextStep}`,
      { display: 'system' },
    )
    return
  }

  params.onSuccess?.()
  params.onExit(
    `${params.successPrefix} ${getRelativeMemoryPath(params.path)}\n\nNext: ${params.nextStep}`,
    { display: 'system' },
  )
}

function CtCommand({ onExit }: { onExit: OnExit }): React.ReactNode {
  const [screen, setScreen] = React.useState<Screen>('overview')
  const projectBootstrap = getProjectCtIdentityBootstrapState()
  const activeDefaults = getActiveCtDefaults()
  const projectRoot = getCtProjectRoot()
  const archiveSummary = getCtArchiveSummary(projectRoot)
  const canonCallback = getCtCanonCallback(projectRoot)
  const globalIdentityOverrideExists = getFsImplementation().existsSync(
    getCtGlobalIdentityOverridePath(),
  )
  const globalSoulOverrideExists = getFsImplementation().existsSync(
    getCtGlobalSoulOverridePath(),
  )

  const projectMode =
    projectBootstrap?.mode === 'guided'
      ? 'Guided'
      : projectBootstrap?.mode === 'customized'
        ? 'Customized'
        : projectBootstrap?.mode === 'skipped'
          ? 'Skipped'
          : 'SeaTurtle starter'

  const globalDefaultsLabel =
    globalIdentityOverrideExists || globalSoulOverrideExists
      ? 'Custom ~/.ct defaults'
      : 'Built-in SeaTurtle defaults'

  if (screen === 'retune') {
    return (
      <Dialog
        title="Retune CT for this project"
        subtitle="This rewrites the private CT starter files that shape how SeaTurtle thinks, sounds, and works in this project."
        onCancel={() => setScreen('overview')}
      >
        <CtIdentityBootstrapDialog
          mode="retune"
          onDone={() => {
            clearMemoryFileCaches()
            setScreen('overview')
          }}
        />
      </Dialog>
    )
  }

  if (screen === 'confirm-reset-project') {
    return (
      <Dialog
        title="Reset this project to active defaults?"
        subtitle="This restores the private CT starter files for this project to the active SeaTurtle defaults. `.ct/session.md` is left alone."
        onCancel={() => setScreen('overview')}
      >
        <Select
          options={[
            {
              label: 'Reset this project',
              value: 'reset',
              description: `Use ${globalDefaultsLabel.toLowerCase()} here`,
            },
            {
              label: 'Back',
              value: 'back',
              description: 'Return to the CT menu',
            },
          ]}
          onChange={value => {
            if (value === 'back') {
              setScreen('overview')
              return
            }

            resetProjectCtIdentityToActiveDefaults()
            clearMemoryFileCaches()
            markCtIdentityBootstrapComplete('defaulted')
            onExit(
              'Reset this project to the active SeaTurtle CT defaults.\n\nNext: edit `.ct/session.md` if you want to steer today’s work, or use /ct to retune CT for this project.',
              { display: 'system' },
            )
          }}
          onCancel={() => setScreen('overview')}
        />
      </Dialog>
    )
  }

  if (screen === 'confirm-reset-global') {
    return (
      <Dialog
        title="Reset global CT defaults?"
        subtitle="This removes your custom global CT identity and soul defaults if they exist."
        onCancel={() => setScreen('overview')}
      >
        <Select
          options={[
            {
              label: 'Reset global defaults',
              value: 'reset',
              description: 'Return future projects to the built-in SeaTurtle defaults',
            },
            {
              label: 'Back',
              value: 'back',
              description: 'Return to the CT menu',
            },
          ]}
          onChange={value => {
            if (value === 'back') {
              setScreen('overview')
              return
            }

            resetCtGlobalDefaultsToShipped()
            onExit(
              'Reset global CT defaults to the built-in SeaTurtle starter kit.\n\nNext: new projects will use the built-in defaults. If you want this project to match too, use /ct and choose “Reset this project to active defaults.”',
              { display: 'system' },
            )
          }}
          onCancel={() => setScreen('overview')}
        />
      </Dialog>
    )
  }

  return (
    <Dialog
      title="CT private identity layer"
      subtitle="Shape how SeaTurtle thinks, sounds, remembers, and works in this project, or manage the default starter kit."
      onCancel={() => onExit('CT menu dismissed', { display: 'system' })}
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>Project root: {getRelativeMemoryPath(projectRoot)}</Text>
          <Text>Project CT mode: {projectMode}</Text>
          <Text>Active defaults: {globalDefaultsLabel}</Text>
          <Text>
            Half-Shell Archives: {archiveSummary.titles} title
            {archiveSummary.titles === 1 ? '' : 's'} · {archiveSummary.inventory}{' '}
            inventory · {archiveSummary.legendEvents} legend event
            {archiveSummary.legendEvents === 1 ? '' : 's'}
          </Text>
          {canonCallback ? <Text dimColor>{canonCallback}</Text> : null}
        </Box>
        <Select
          options={[
            {
              label: 'Edit project identity',
              value: 'edit-identity' as const,
              description: 'Shape how CT behaves and thinks in this project',
            },
            {
              label: 'Edit project soul',
              value: 'edit-soul' as const,
              description: 'Adjust warmth, curiosity, playfulness, and overall CT tone',
            },
            {
              label: 'Edit project role',
              value: 'edit-role' as const,
              description: 'Tune how exploratory, operational, or exacting CT should be here',
            },
            {
              label: 'Edit project user context',
              value: 'edit-user' as const,
              description: 'Keep lightweight notes about how to collaborate well with the user',
            },
            {
              label: 'Edit project bootstrap ritual',
              value: 'edit-bootstrap' as const,
              description: 'Shape the first-run or retune conversation tone for this project',
            },
            {
              label: 'Edit current session note',
              value: 'edit-session' as const,
              description: 'Steer today’s work without changing the whole project identity',
            },
            {
              label: 'Retune CT for this project',
              value: 'retune' as const,
              description: 'Use the short conversational picker again and rewrite identity + soul',
            },
            {
              label: 'Reset this project to active defaults',
              value: 'reset-project' as const,
              description: 'Use the current CT defaults here without touching `.ct/session.md`',
            },
            {
              label: 'Edit global identity default',
              value: 'edit-global-identity' as const,
              description: 'Future projects will inherit this CT identity',
            },
            {
              label: 'Edit global soul default',
              value: 'edit-global-soul' as const,
              description: 'Future projects will inherit this CT tone and values layer',
            },
            {
              label: 'Reset global defaults to SeaTurtle starter kit',
              value: 'reset-global' as const,
              description: 'Remove custom global defaults and go back to the shipped baseline',
            },
          ]}
          onChange={(value: Action) => {
            switch (value) {
              case 'edit-identity':
                openCtFile({
                  path: getCtIdentityPath(projectRoot),
                  initialContent: activeDefaults.identity,
                  onExit,
                  successPrefix: 'Opened project identity at',
                  nextStep:
                    'adjust CT’s role here, or use /ct again and choose “Retune CT for this project” if you want the guided picker',
                  onSuccess: () => markCtIdentityBootstrapComplete('customized'),
                })
                return
              case 'edit-soul':
                openCtFile({
                  path: getCtSoulPath(projectRoot),
                  initialContent: activeDefaults.soul,
                  onExit,
                  successPrefix: 'Opened project soul at',
                  nextStep:
                    'shape CT’s warmth and playfulness here, or use /ct again if you want to reset to the active defaults',
                  onSuccess: () => markCtIdentityBootstrapComplete('customized'),
                })
                return
              case 'edit-role':
                openCtFile({
                  path: getCtRolePath(projectRoot),
                  initialContent: getActiveCtDefaults().role,
                  onExit,
                  successPrefix: 'Opened project role at',
                  nextStep:
                    'shape how CT should lean here, or use /ct retune if you want the guided picker again',
                  onSuccess: () => markCtIdentityBootstrapComplete('customized'),
                })
                return
              case 'edit-user':
                openCtFile({
                  path: getCtUserPath(projectRoot),
                  initialContent: getActiveCtDefaults().user,
                  onExit,
                  successPrefix: 'Opened project user context at',
                  nextStep:
                    'keep only what improves collaboration, then jump back into the session',
                  onSuccess: () => markCtIdentityBootstrapComplete('customized'),
                })
                return
              case 'edit-bootstrap':
                openCtFile({
                  path: getCtBootstrapPath(projectRoot),
                  initialContent: getActiveCtDefaults().bootstrap,
                  onExit,
                  successPrefix: 'Opened project bootstrap ritual at',
                  nextStep:
                    'keep the opening conversational and small, then use /ct retune when you want to feel it in practice',
                  onSuccess: () => markCtIdentityBootstrapComplete('customized'),
                })
                return
              case 'edit-session':
                openCtFile({
                  path: getCtSessionPath(projectRoot),
                  initialContent: getActiveCtDefaults().session,
                  onExit,
                  successPrefix: 'Opened current session note at',
                  nextStep:
                    'capture what matters today here, then jump back into the work',
                })
                return
              case 'retune':
                setScreen('retune')
                return
              case 'reset-project':
                setScreen('confirm-reset-project')
                return
              case 'edit-global-identity':
                openCtFile({
                  path: ensureCtGlobalDefaultFile('identity'),
                  initialContent: activeDefaults.identity,
                  onExit,
                  successPrefix: 'Opened global CT identity default at',
                  nextStep:
                    'new projects will use it automatically; use /ct and reset this project if you want to apply it here too',
                })
                return
              case 'edit-global-soul':
                openCtFile({
                  path: ensureCtGlobalDefaultFile('soul'),
                  initialContent: activeDefaults.soul,
                  onExit,
                  successPrefix: 'Opened global CT soul default at',
                  nextStep:
                    'new projects will use it automatically; use /ct and reset this project if you want to apply it here too',
                })
                return
              case 'reset-global':
                setScreen('confirm-reset-global')
                return
            }
          }}
          onCancel={() => onExit('CT menu dismissed', { display: 'system' })}
          visibleOptionCount={11}
        />
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmedArgs = args?.trim() || ''

  if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
    onDone(
      'Run /ct. It manages the private `.ct/` layer for this project.\n\nTypical flow:\n1. Edit `.ct/session.md` for today’s context\n2. Retune CT for this project if the current posture feels off\n3. Edit or reset the global defaults if you want new projects to start differently\n\nDeep docs: docs/FEATURES-ROUTER.md and README.md',
      { display: 'system' },
    )
    return null
  }

  await ensureProjectCtIdentityBootstrap()
  return <CtCommand onExit={onDone} />
}
