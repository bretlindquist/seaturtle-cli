import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import {
  inspectAndSelectAutoworkMode,
  prepareAutoworkSafeExecution,
  type AutoworkStartupContext,
  verifyAutoworkSafeExecution,
} from '../../services/autowork/runner.js'
import {
  getAutoworkDangerousQuip,
  getAutoworkLaunchQuip,
} from '../../services/autowork/quips.js'
import { resolveActiveAutoworkPlanFile } from '../../services/autowork/planResolution.js'
import {
  updateAutoworkState,
  type AutoworkExecutionScope,
  type AutoworkRunMode,
} from '../../services/autowork/state.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

type EntryPoint = 'autowork' | 'swim'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type ShellAction = 'run' | 'step' | 'dangerous' | 'status' | 'doctor' | 'back'

function titleCaseRunMode(runMode: AutoworkRunMode): string {
  return runMode === 'dangerous' ? 'dangerous' : 'safe'
}

function formatExecutionScope(scope: AutoworkExecutionScope): string {
  return scope === 'step' ? 'one chunk only' : 'plan to completion'
}

function formatChecks(
  context: AutoworkStartupContext,
  doctor: boolean,
): string[] {
  return context.eligibility.checks.map(check =>
    doctor
      ? `- ${check.name}: ${check.ok ? 'ok' : 'failed'} - ${check.summary}`
      : `- ${check.name}: ${check.ok ? 'ok' : 'failed'}`,
  )
}

function formatStatusSummary(
  entryPoint: EntryPoint,
  context: AutoworkStartupContext,
): string {
  const quip = getAutoworkLaunchQuip(
    entryPoint,
    `${context.planPath}:${context.mode}:${context.nextPendingChunkId ?? 'none'}`,
  )

  return [
    quip,
    '',
    `Mode: ${context.mode}`,
    `Why: ${context.modeReason}`,
    `Plan: ${context.planPath}`,
    `Run mode: ${titleCaseRunMode(context.state.runMode)}`,
    `Execution scope: ${formatExecutionScope(context.state.executionScope)}`,
    `Next chunk: ${context.nextPendingChunkId ?? 'none'}`,
    `Validation known: ${context.inspection.validationKnownForLastChunk ? 'yes' : 'no'}`,
    `Ignore hygiene: ${context.inspection.ignoreHygieneOk ? 'healthy' : 'needs work'}`,
    '',
    'Current readiness:',
    ...formatChecks(context, false),
    '',
    context.mode === 'execution'
      ? `Next: use /${entryPoint} run to continue the approved plan from ${context.nextPendingChunkId ?? 'the next chunk'}, or /${entryPoint} step to execute only one chunk.`
      : context.mode === 'verification'
        ? `Next: use /${entryPoint} verify to enforce the checkpoint for ${context.state.currentChunkId ?? 'the active chunk'}.`
        : `Next: use /${entryPoint} doctor for the fuller checkpoint breakdown.`,
  ].join('\n')
}

function formatDoctorSummary(context: AutoworkStartupContext): string {
  const lines = [
    'Autowork doctor',
    '',
    `Plan: ${context.planPath}`,
    `Repo root: ${context.repoRoot ?? 'not in git repo'}`,
    `Run mode: ${titleCaseRunMode(context.state.runMode)}`,
    `Execution scope: ${formatExecutionScope(context.state.executionScope)}`,
    `Selected mode: ${context.mode}`,
    `Reason: ${context.modeReason}`,
    `Current branch: ${context.inspection.branch ?? 'unknown'}`,
    `Uncommitted changes: ${context.inspection.hasUncommittedChanges ? 'yes' : 'no'}`,
    `Executable plan available: ${context.inspection.hasExecutablePlanFile ? 'yes' : 'no'}`,
    `Recently completed unverified chunk: ${context.inspection.hasRecentlyCompletedUnverifiedChunk ? 'yes' : 'no'}`,
    `Validation known for last chunk: ${context.inspection.validationKnownForLastChunk ? 'yes' : 'no'}`,
    `Ignore hygiene ok: ${context.inspection.ignoreHygieneOk ? 'yes' : 'no'}`,
    '',
    'Eligibility checks:',
    ...formatChecks(context, true),
  ]

  if (!context.eligibility.ok && context.eligibility.parseFailure) {
    lines.push(
      '',
      `Plan parse failure: ${context.eligibility.parseFailure.code}`,
      context.eligibility.parseFailure.message,
    )
  }

  if (context.inspection.latestRelevantCommits.length > 0) {
    lines.push(
      '',
      'Latest commits:',
      ...context.inspection.latestRelevantCommits.map(line => `- ${line}`),
    )
  }

  if (context.inspection.gitStatusShort.length > 0) {
    lines.push(
      '',
      'git status --short:',
      ...context.inspection.gitStatusShort.map(line => `- ${line}`),
    )
  }

  return lines.join('\n')
}

async function getAutoworkContext(
  entryPoint: EntryPoint,
): Promise<
  | { ok: true; context: AutoworkStartupContext }
  | { ok: false; message: string }
> {
  const resolved = await resolveActiveAutoworkPlanFile()
  if (!resolved.ok) {
    const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
    return {
      ok: false,
      message: [
        resolved.message,
        '',
        resolved.candidates.length > 0
          ? `Candidates:\n${resolved.candidates.map(candidate => `- ${candidate}`).join('\n')}`
          : 'Next: create one tracked root-level dated plan file like `2026-04-05-feature-name-state.md`.',
        '',
        `Then rerun ${baseName} status or ${baseName} doctor.`,
      ].join('\n'),
    }
  }

  return {
    ok: true,
    context: await inspectAndSelectAutoworkMode(resolved.planPath),
  }
}

async function runAutowork(
  entryPoint: EntryPoint,
  executionScope: AutoworkExecutionScope = 'plan',
): Promise<
  | {
      ok: true
      message: string
      shouldQuery: true
      metaMessages: string[]
      nextInput: string
    }
  | { ok: false; message: string }
> {
  const resolved = await resolveActiveAutoworkPlanFile()
  if (!resolved.ok) {
    const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
    return {
      ok: false,
      message: [
        resolved.message,
        '',
        `Then rerun ${baseName} run after the tracked plan is ready.`,
      ].join('\n'),
    }
  }

  const launch = await prepareAutoworkSafeExecution(
    resolved.planPath,
    entryPoint,
    executionScope,
  )
  if (!launch.ok) {
    return { ok: false, message: launch.message }
  }

  const quip = getAutoworkLaunchQuip(entryPoint, launch.chunkId)

  return {
    ok: true,
    message: [quip, '', launch.visibleMessage].join('\n'),
    shouldQuery: true,
    metaMessages: launch.metaMessages,
    nextInput: launch.nextInput,
  }
}

async function setAutoworkRunMode(
  entryPoint: EntryPoint,
  runMode: AutoworkRunMode,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const resolved = await resolveActiveAutoworkPlanFile()
  if (!resolved.ok) {
    const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
    return {
      ok: false,
      message: [
        resolved.message,
        '',
        `Then rerun ${baseName} dangerous after the tracked plan is ready.`,
      ].join('\n'),
    }
  }

  const context = await inspectAndSelectAutoworkMode(resolved.planPath)
  if (!context.repoRoot) {
    return { ok: false, message: 'Autowork requires a git repository.' }
  }

  updateAutoworkState(
    current => ({
      ...current,
      runMode,
    }),
    context.repoRoot,
  )

  const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
  const quip = getAutoworkDangerousQuip(
    entryPoint,
    `${context.planPath}:dangerous:${context.state.runCount}`,
  )
  const heading = entryPoint === 'swim' ? 'Swim dangerous mode armed.' : 'Autowork dangerous mode armed.'

  return {
    ok: true,
    message: [
      quip,
      '',
      heading,
      '',
      'This is heavily discouraged.',
      'Dangerous mode still uses the tracked plan, but it can continue through selected validation and git checkpoint failures by recording explicit debt instead of stopping cleanly.',
      'It can consume more tokens, time, and context than safe mode.',
      'Safe mode is still the recommended path.',
      '',
      `Current state: ${baseName} is now marked dangerous.`,
      `Default behavior: ${baseName} run will attempt to carry the approved plan to completion.`,
      `Use ${baseName} step when you want only one guarded chunk.`,
      `Use ${baseName} status or ${baseName} doctor to inspect the current state.`,
    ].join('\n'),
  }
}

async function verifyAutowork(
  entryPoint: EntryPoint,
): Promise<
  | { ok: true; message: string; nextInput?: string }
  | { ok: false; message: string }
> {
  const resolved = await resolveActiveAutoworkPlanFile()
  if (!resolved.ok) {
    const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
    return {
      ok: false,
      message: [
        resolved.message,
        '',
        `Then rerun ${baseName} verify after the tracked plan is ready.`,
      ].join('\n'),
    }
  }

  return verifyAutoworkSafeExecution(resolved.planPath, entryPoint)
}

function titleForEntryPoint(entryPoint: EntryPoint): string {
  return entryPoint === 'swim' ? 'Swim mode' : 'Autowork'
}

function subtitleForEntryPoint(entryPoint: EntryPoint): string {
  return entryPoint === 'swim'
    ? 'Whimsical shell, serious checkpoints. Same safe tracked-plan guarantees.'
    : 'Operator-forward tracked-plan orchestration with explicit validation, commit, and stop gates.'
}

function AutoworkMenu({
  entryPoint,
  onDone,
}: {
  entryPoint: EntryPoint
  onDone: OnDone
}): React.ReactNode {
  return (
    <Dialog
      title={titleForEntryPoint(entryPoint)}
      subtitle={subtitleForEntryPoint(entryPoint)}
      onCancel={() =>
        onDone(`${titleForEntryPoint(entryPoint)} dismissed`, {
          display: 'system',
        })
      }
    >
      <Box flexDirection="column" gap={1}>
        <Text dimColor>
          This is not the existing permission auto mode. It is tracked-plan
          orchestration and it uses more tokens, context, time, and risk than
          ordinary interactive work.
        </Text>
        <Select
          options={[
            {
              label: 'Run the full plan',
              value: 'run' as const,
              description: 'Run the approved tracked chunk plan to completion, one guarded chunk at a time',
            },
            {
              label: 'Run one chunk only',
              value: 'step' as const,
              description: 'Execute one chunk, verify it, then stop instead of continuing the plan',
            },
            {
              label: 'Dangerous mode',
              value: 'dangerous' as const,
              description: 'Heavily discouraged. Relax selected checkpoint failures into recorded debt instead of safe-mode stops.',
            },
            {
              label: 'Status snapshot',
              value: 'status' as const,
              description: 'See the selected mode, next chunk, and readiness summary',
            },
            {
              label: 'Doctor',
              value: 'doctor' as const,
              description: 'See the fuller checkpoint and refusal breakdown',
            },
            {
              label: 'Back',
              value: 'back' as const,
              description: 'Return to the conversation',
            },
          ]}
          onChange={async (value: ShellAction) => {
            if (value === 'back') {
              onDone(`${titleForEntryPoint(entryPoint)} dismissed`, {
                display: 'system',
              })
              return
            }

            if (value === 'run' || value === 'step') {
              const execution = await runAutowork(
                entryPoint,
                value === 'step' ? 'step' : 'plan',
              )
              if (!execution.ok) {
                onDone(execution.message, { display: 'system' })
                return
              }

              onDone(execution.message, {
                display: 'system',
                shouldQuery: execution.shouldQuery,
                metaMessages: execution.metaMessages,
                nextInput: execution.nextInput,
                submitNextInput: true,
              })
              return
            }

            if (value === 'dangerous') {
              const changed = await setAutoworkRunMode(entryPoint, 'dangerous')
              onDone(changed.message, { display: 'system' })
              return
            }

            const resolved = await getAutoworkContext(entryPoint)
            if (!resolved.ok) {
              onDone(resolved.message, { display: 'system' })
              return
            }

            onDone(
              value === 'doctor'
                ? formatDoctorSummary(resolved.context)
                : formatStatusSummary(entryPoint, resolved.context),
              { display: 'system' },
            )
          }}
          onCancel={() =>
            onDone(`${titleForEntryPoint(entryPoint)} dismissed`, {
              display: 'system',
            })
          }
        />
      </Box>
    </Dialog>
  )
}

export function createAutoworkCall(entryPoint: EntryPoint): LocalJSXCommandCall {
  return async (onDone, _context, args) => {
    const trimmedArgs = args?.trim().toLowerCase() || ''

    if (COMMON_HELP_ARGS.includes(trimmedArgs)) {
      const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
      onDone(
        [
          `${baseName} is tracked-plan orchestration, not the existing permission auto mode.`,
          '',
          'Available now:',
          `- ${baseName}`,
          `- ${baseName} dangerous`,
          `- ${baseName} run`,
          `- ${baseName} step`,
          `- ${baseName} status`,
          `- ${baseName} doctor`,
          `- ${baseName} verify`,
          '',
          `${baseName} run carries the approved tracked plan to completion, one guarded chunk at a time.`,
          `${baseName} step executes only one guarded chunk, then stops after verification.`,
          'Dangerous mode is heavily discouraged and is a separate operator choice that relaxes selected checkpoint failures into recorded debt.',
        ].join('\n'),
        { display: 'system' },
      )
      return null
    }

    if (trimmedArgs === 'dangerous') {
      const changed = await setAutoworkRunMode(entryPoint, 'dangerous')
      onDone(changed.message, { display: 'system' })
      return null
    }

    if (trimmedArgs === 'run') {
      const execution = await runAutowork(entryPoint, 'plan')
      onDone(execution.message, execution.ok
        ? {
            display: 'system',
            shouldQuery: execution.shouldQuery,
            metaMessages: execution.metaMessages,
            nextInput: execution.nextInput,
            submitNextInput: true,
          }
        : { display: 'system' })
      return null
    }

    if (trimmedArgs === 'step') {
      const execution = await runAutowork(entryPoint, 'step')
      onDone(execution.message, execution.ok
        ? {
            display: 'system',
            shouldQuery: execution.shouldQuery,
            metaMessages: execution.metaMessages,
            nextInput: execution.nextInput,
            submitNextInput: true,
          }
        : { display: 'system' })
      return null
    }

    if (trimmedArgs === 'verify') {
      const verification = await verifyAutowork(entryPoint)
      onDone(verification.message, verification.ok && verification.nextInput
        ? {
            display: 'system',
            nextInput: verification.nextInput,
            submitNextInput: true,
          }
        : { display: 'system' })
      return null
    }

    if (trimmedArgs === 'status' || trimmedArgs === 'doctor') {
      const resolved = await getAutoworkContext(entryPoint)
      if (!resolved.ok) {
        onDone(resolved.message, { display: 'system' })
        return null
      }

      onDone(
        trimmedArgs === 'doctor'
          ? formatDoctorSummary(resolved.context)
          : formatStatusSummary(entryPoint, resolved.context),
        { display: 'system' },
      )
      return null
    }

    if (trimmedArgs === '' || trimmedArgs === 'start') {
      return <AutoworkMenu entryPoint={entryPoint} onDone={onDone} />
    }

    onDone(
      [
        `Unknown ${titleForEntryPoint(entryPoint).toLowerCase()} option.`,
        '',
        `Use /${entryPoint} for the menu, or one of:`,
        `- /${entryPoint} dangerous`,
        `- /${entryPoint} run`,
        `- /${entryPoint} step`,
        `- /${entryPoint} status`,
        `- /${entryPoint} doctor`,
        `- /${entryPoint} verify`,
      ].join('\n'),
      { display: 'system' },
    )
    return null
  }
}

export const call = createAutoworkCall('autowork')
