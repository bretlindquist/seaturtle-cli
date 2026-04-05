import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import {
  inspectAndSelectAutoworkMode,
  type AutoworkStartupContext,
} from '../../services/autowork/runner.js'
import { getAutoworkLaunchQuip } from '../../services/autowork/quips.js'
import { resolveActiveAutoworkPlanFile } from '../../services/autowork/planResolution.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

type EntryPoint = 'autowork' | 'swim'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type ShellAction = 'status' | 'doctor' | 'back'

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
    `Next chunk: ${context.nextPendingChunkId ?? 'none'}`,
    `Validation known: ${context.inspection.validationKnownForLastChunk ? 'yes' : 'no'}`,
    `Ignore hygiene: ${context.inspection.ignoreHygieneOk ? 'healthy' : 'needs work'}`,
    '',
    'Current readiness:',
    ...formatChecks(context, false),
    '',
    context.mode === 'execution'
      ? 'Next: the one-chunk safe execution loop is the next autowork implementation chunk.'
      : `Next: use /${entryPoint} doctor for the fuller checkpoint breakdown.`,
  ].join('\n')
}

function formatDoctorSummary(context: AutoworkStartupContext): string {
  const lines = [
    'Autowork doctor',
    '',
    `Plan: ${context.planPath}`,
    `Repo root: ${context.repoRoot ?? 'not in git repo'}`,
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
          `- ${baseName} status`,
          `- ${baseName} doctor`,
          '',
          'Safe autowork uses more context, tokens, time, and risk than normal interactive work. Each chunk is expected to validate and commit before progression continues.',
        ].join('\n'),
        { display: 'system' },
      )
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
        `- /${entryPoint} status`,
        `- /${entryPoint} doctor`,
      ].join('\n'),
      { display: 'system' },
    )
    return null
  }
}

export const call = createAutoworkCall('autowork')
