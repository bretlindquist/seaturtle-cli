import * as React from 'react'
import { readFileSync } from 'node:fs'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import {
  inspectAndSelectAutoworkMode,
  prepareAutoworkSafeExecution,
  verifyAutoworkSafeExecution,
} from '../../services/autowork/runner.js'
import {
  canLaunchLocalLifecycleSwarm,
  launchLocalLifecycleSwarm,
} from '../../services/autowork/localLifecycleSwarm.js'
import {
  formatRequestedTimeBudget,
  resolveAutoworkBackendPolicy,
  resolveAutoworkLaunchAuthority,
} from '../../services/autowork/backendPolicy.js'
import { resolveAutoworkCloudOffloadCapability } from '../../services/autowork/cloudOffloadCapability.js'
import {
  getAutoworkDangerousQuip,
  getAutoworkLaunchQuip,
} from '../../services/autowork/quips.js'
import {
  resolveActiveAutoworkPlanFile,
  resolveExplicitAutoworkPlanPath,
} from '../../services/autowork/planResolution.js'
import {
  readAutoworkState,
  updateAutoworkState,
  type AutoworkExecutionScope,
  type AutoworkRunMode,
} from '../../services/autowork/state.js'
import { parseAutoworkBudgetInput } from '../../services/autowork/runtimeWindow.js'
import { getCtProjectRoot } from '../../services/projectIdentity/paths.js'
import {
  markActivePlanApproved,
  peekActiveWorkstream,
} from '../../services/projectIdentity/workflowState.js'
import { launchRemoteAutoworkTask } from '../../tasks/RemoteAutoworkTask/RemoteAutoworkTask.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import {
  formatAutoworkDoctorSummary,
  formatAutoworkStatusSummary,
  resolveAutoworkInspectionContext,
} from '../../services/autowork/inspectionSummary.js'
import { syncWorkflowRuntimeState } from '../../state/workflowRuntimeState.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandContext,
} from '../../types/command.js'

type EntryPoint = 'autowork' | 'swim'

type OnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
  },
) => void

type ShellAction =
  | 'run'
  | 'step'
  | 'safe'
  | 'dangerous'
  | 'status'
  | 'doctor'
  | 'back'

function isLifecycleMode(
  mode: string,
): mode is 'discovery' | 'research' | 'plan-hardening' | 'audit-and-polish' {
  return (
    mode === 'discovery' ||
    mode === 'research' ||
    mode === 'plan-hardening' ||
    mode === 'audit-and-polish'
  )
}

function splitCommandArgs(args: string): { head: string; tail: string } {
  const trimmed = args.trim()
  if (!trimmed) {
    return { head: '', tail: '' }
  }

  const firstWhitespace = trimmed.search(/\s/u)
  if (firstWhitespace === -1) {
    return { head: trimmed.toLowerCase(), tail: '' }
  }

  return {
    head: trimmed.slice(0, firstWhitespace).toLowerCase(),
    tail: trimmed.slice(firstWhitespace).trim(),
  }
}

function parseAutoworkRunTail(
  tail: string,
): { ok: true; timeBudgetMs: number | null } | { ok: false; message: string } {
  const trimmed = tail.trim()
  if (!trimmed) {
    return { ok: true, timeBudgetMs: null }
  }

  const parsed = parseAutoworkBudgetInput(trimmed)
  if (!parsed.ok) {
    return { ok: false, message: parsed.message }
  }

  return {
    ok: true,
    timeBudgetMs: parsed.timeBudgetMs,
  }
}

function parseCloudOffloadArgs(
  tail: string,
): { ok: true; local: boolean; host?: string; action: 'run' | 'step'; timeBudget?: string } | { ok: false; message: string } {
  const trimmed = tail.trim()
  if (!trimmed) {
    return {
      ok: false,
      message: 'Usage: /autowork cloud local run 8h\n   or: /autowork cloud <ssh-host> run 8h',
    }
  }

  const parts = trimmed.split(/\s+/u)
  const defaultAction = parts[0]?.toLowerCase()
  const savedSshConfigs = getInitialSettings().sshConfigs ?? []

  let target = parts[0] ?? ''
  let actionRaw = parts[1] ?? ''
  let rest = parts.slice(2)

  if ((defaultAction === 'run' || defaultAction === 'step') && savedSshConfigs.length === 1) {
    target = savedSshConfigs[0]!.sshHost
    actionRaw = parts[0]!
    rest = parts.slice(1)
  } else if (parts.length < 2) {
    return {
      ok: false,
      message:
        savedSshConfigs.length > 1
          ? 'Multiple SSH configs are saved. Use `/autowork cloud <ssh-host> run 8h` to choose one explicitly.'
          : 'Usage: /autowork cloud local run 8h\n   or: /autowork cloud <ssh-host> run 8h',
    }
  }

  const action = actionRaw?.toLowerCase()
  if (action !== 'run' && action !== 'step') {
    return {
      ok: false,
      message: 'Cloud offload currently supports only run and step actions.',
    }
  }

  const local = target === 'local' || target === '--local'
  if (!local && (!target || target.startsWith('/'))) {
    return {
      ok: false,
      message: 'Cloud offload requires `local` or an SSH host/config alias.',
    }
  }

  const budget = rest.join(' ').trim()
  if (budget) {
    const parsed = parseAutoworkBudgetInput(budget)
    if (!parsed.ok) {
      return { ok: false, message: parsed.message }
    }
  }

  return {
    ok: true,
    local,
    host: local ? undefined : target,
    action,
    timeBudget: budget || undefined,
  }
}

async function startCloudOffload(
  entryPoint: EntryPoint,
  context: LocalJSXCommandContext,
  options: {
    action: 'run' | 'step'
    local: boolean
    host?: string
    timeBudget?: string
    origin: 'explicit' | 'auto'
    reason?: string | null
  },
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const started = await launchRemoteAutoworkTask(
    {
      entryPoint,
      action: options.action,
      host: options.host,
      cwd: getCtProjectRoot(),
      local: options.local,
      timeBudget: options.timeBudget,
      permissionMode: context.getAppState().toolPermissionContext.mode,
      dangerouslySkipPermissions:
        context.getAppState().toolPermissionContext.dangerouslySkipPermissions,
    },
    {
      abortController: context.abortController,
      getAppState: context.getAppState,
      setAppState: context.setAppState,
    },
  )

  syncWorkflowRuntimeState(getCtProjectRoot(), context.setAppState)
  return {
    ok: true,
    message: [
      options.origin === 'auto'
        ? `${titleForEntryPoint(entryPoint)} auto-offloaded to cloud supervision.`
        : `${titleForEntryPoint(entryPoint)} cloud offload started.`,
      '',
      `Task: ${started.taskId}`,
      `Target: ${options.local ? 'local provider child' : options.host}`,
      `Action: ${entryPoint} ${options.action}${options.timeBudget ? ` ${options.timeBudget}` : ''}`,
      ...(options.reason ? ['', `Why: ${options.reason}`] : []),
      'Next: use /tasks to inspect the run, or /autowork status for workflow state.',
    ].join('\n'),
  }
}

async function launchCloudOffload(
  entryPoint: EntryPoint,
  context: LocalJSXCommandContext,
  tail: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const capability = resolveAutoworkCloudOffloadCapability()
  if (capability.status === 'unavailable') {
    return { ok: false, message: capability.reason }
  }

  const parsed = parseCloudOffloadArgs(tail)
  if (!parsed.ok) {
    return parsed
  }

  return startCloudOffload(entryPoint, context, {
    action: parsed.action,
    local: parsed.local,
    host: parsed.host,
    timeBudget: parsed.timeBudget,
    origin: 'explicit',
  })
}

async function selectAutoworkPlan(
  entryPoint: EntryPoint,
  rawPath: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const requestedPath = rawPath.trim()
  const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
  if (!requestedPath) {
    return {
      ok: false,
      message: [
        'Missing plan path.',
        '',
        `Usage: ${baseName} use <tracked-dated-plan-state.md>`,
      ].join('\n'),
    }
  }

  const selected = await resolveExplicitAutoworkPlanPath(requestedPath)
  if (!selected.ok) {
    return {
      ok: false,
      message: [
        `Could not select autowork plan: ${requestedPath}`,
        '',
        selected.message,
      ].join('\n'),
    }
  }

  const state = readAutoworkState(selected.repoRoot)
  if (state.currentChunkId || state.implementedButUnverified) {
    return {
      ok: false,
      message: [
        'Autowork cannot switch plans while a chunk is active or awaiting verification.',
        '',
        `Current chunk: ${state.currentChunkId ?? 'unknown'}`,
        `Next: finish the checkpoint with ${baseName} verify or clear the current run before retargeting the plan.`,
      ].join('\n'),
    }
  }

  updateAutoworkState(
    current => ({
      ...current,
      selectedPlanPath: selected.planPath,
      stopReason: null,
    }),
    selected.repoRoot,
  )
  markActivePlanApproved(
    {
      planFilePath: selected.planPath,
      planContent: readFileSync(selected.planPath, 'utf8'),
      phaseReason: 'Autowork selected an executable workflow plan.',
    },
    selected.repoRoot,
  )

  return {
    ok: true,
    message: [
      `${titleForEntryPoint(entryPoint)} plan selected.`,
      '',
      `Plan: ${selected.planPath}`,
      'Source: explicit selection',
      `Next: use ${baseName} status, ${baseName} run, or ${baseName} step.`,
    ].join('\n'),
  }
}

async function resolveAutoworkRunEntry(
  entryPoint: EntryPoint,
  action: 'run' | 'step',
): Promise<
  | {
      ok: true
      planPath: string | null
    }
  | {
      ok: false
      message: string
    }
> {
  const resolved = await resolveActiveAutoworkPlanFile()
  if (resolved.ok) {
    return {
      ok: true,
      planPath: resolved.planPath,
    }
  }

  const bootstrapContext = await inspectAndSelectAutoworkMode(null)
  if (
    bootstrapContext.repoRoot &&
    (bootstrapContext.mode === 'discovery' ||
      bootstrapContext.mode === 'research' ||
      bootstrapContext.mode === 'plan-hardening' ||
      bootstrapContext.mode === 'audit-and-polish')
  ) {
    return {
      ok: true,
      planPath: null,
    }
  }

  const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
  return {
    ok: false,
    message: [
      resolved.message,
      '',
      `Then rerun ${baseName} ${action} after the tracked plan is ready.`,
    ].join('\n'),
  }
}

async function runAutowork(
  entryPoint: EntryPoint,
  context: LocalJSXCommandContext,
  executionScope: AutoworkExecutionScope = 'plan',
  timeBudgetMs: number | null = null,
): Promise<
  | {
      ok: true
      message: string
      shouldQuery: boolean
      metaMessages: string[]
      nextInput: string
    }
  | { ok: false; message: string }
> {
  const entry = await resolveAutoworkRunEntry(
    entryPoint,
    executionScope === 'step' ? 'step' : 'run',
  )
  if (!entry.ok) {
    return {
      ok: false,
      message: entry.message,
    }
  }

  const startupContext = await inspectAndSelectAutoworkMode(entry.planPath)

  const launch = await prepareAutoworkSafeExecution(
    entry.planPath,
    entryPoint,
    executionScope,
    timeBudgetMs,
  )
  if (!launch.ok) {
    return { ok: false, message: launch.message }
  }

  if (
    startupContext.repoRoot &&
    executionScope === 'plan' &&
    isLifecycleMode(startupContext.mode)
  ) {
    const executionPacket =
      peekActiveWorkstream(startupContext.repoRoot)?.packets.execution ?? null
    const backendPolicy = resolveAutoworkBackendPolicy(startupContext.mode, {
      heartbeatEnabled:
        executionPacket?.heartbeatEnabled === true || timeBudgetMs !== null,
      timeBudgetMs,
      deadlineAt: executionPacket?.deadlineAt ?? null,
      cloudOffloadActive:
        executionPacket?.swarmBackend === 'cloud' &&
        executionPacket?.swarmActive === true,
    })
    const launchAuthority = resolveAutoworkLaunchAuthority(
      startupContext.mode,
      backendPolicy,
      {
        executionScope,
        timeBudgetMs,
        offloadChild: process.env.SEATURTLE_AUTOWORK_OFFLOAD_CHILD === '1',
        canLaunchLocalLifecycleSwarm: canLaunchLocalLifecycleSwarm(
          startupContext.mode,
          backendPolicy,
          context,
          context.canUseTool,
        ),
      },
    )

    if (launchAuthority.kind === 'launch-cloud-local') {
      const launched = await startCloudOffload(entryPoint, context, {
        action: 'run',
        local: true,
        timeBudget:
          timeBudgetMs === null
            ? undefined
            : formatRequestedTimeBudget(timeBudgetMs),
        origin: 'auto',
        reason: launchAuthority.reason,
      })
      return launched.ok
        ? {
            ok: true,
            message: launched.message,
            shouldQuery: false,
            metaMessages: [],
            nextInput: '',
          }
        : { ok: false, message: launched.message }
    }

    if (launchAuthority.kind === 'launch-cloud-saved-host') {
      const launched = await startCloudOffload(entryPoint, context, {
        action: 'run',
        local: false,
        host: launchAuthority.host,
        timeBudget:
          timeBudgetMs === null
            ? undefined
            : formatRequestedTimeBudget(timeBudgetMs),
        origin: 'auto',
        reason: launchAuthority.reason,
      })
      return launched.ok
        ? {
            ok: true,
            message: launched.message,
            shouldQuery: false,
            metaMessages: [],
            nextInput: '',
          }
        : { ok: false, message: launched.message }
    }

    if (launchAuthority.kind === 'blocked') {
      return {
        ok: false,
        message: launchAuthority.message,
      }
    }

    if (launchAuthority.kind === 'launch-local-swarm') {
      const prompt = launch.metaMessages[0]
      if (typeof prompt !== 'string') {
        return {
          ok: false,
          message:
            'SeaTurtle could not construct the lifecycle prompt required for local swarm autowork.',
        }
      }

      const started = await launchLocalLifecycleSwarm({
        entryPoint,
        repoRoot: startupContext.repoRoot,
        mode: startupContext.mode,
        prompt,
        toolUseContext: context,
        canUseTool: context.canUseTool!,
      })

      if (!started.ok) {
        return {
          ok: false,
          message: started.message,
        }
      }

      return {
        ok: true,
        message: [
          `${titleForEntryPoint(entryPoint)} local swarm started.`,
          '',
          `Task: ${started.task.id}`,
          `Agent: ${started.agent.agentType}`,
          `Wave: ${startupContext.mode}`,
          'Execution path: local swarm (in-process)',
          'Next: inspect /tasks for the lifecycle worker, or /autowork status for workflow state.',
        ].join('\n'),
        shouldQuery: false,
        metaMessages: [],
        nextInput: '',
      }
    }
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
        `Then rerun ${baseName} ${runMode} after the tracked plan is ready.`,
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
  if (runMode === 'safe') {
    const heading =
      entryPoint === 'swim' ? 'Swim safe mode restored.' : 'Autowork safe mode restored.'

    return {
      ok: true,
      message: [
        heading,
        '',
        'Safe mode is the recommended default.',
        'It carries the approved tracked plan to completion, one guarded chunk at a time, and stops cleanly on checkpoint failure.',
        '',
        `Current state: ${baseName} is now marked safe.`,
        `Use ${baseName} run to carry the approved plan to completion.`,
        `Use ${baseName} step when you want only one guarded chunk.`,
      ].join('\n'),
    }
  }

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

function buildNonInteractiveUsage(entryPoint: EntryPoint): string {
  return [
    `${titleForEntryPoint(entryPoint)} is available in headless mode only with an explicit action.`,
    '',
    `Use one of:`,
    `- /${entryPoint} safe`,
    `- /${entryPoint} dangerous`,
    `- /${entryPoint} use <path>`,
    `- /${entryPoint} run`,
    `- /${entryPoint} run 8h`,
    `- /${entryPoint} cloud run 8h`,
    `- /${entryPoint} step`,
    `- /${entryPoint} status`,
    `- /${entryPoint} doctor`,
    `- /${entryPoint} verify`,
  ].join('\n')
}

function AutoworkMenu({
  entryPoint,
  onDone,
  context,
}: {
  entryPoint: EntryPoint
  onDone: OnDone
  context: LocalJSXCommandContext
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
              label: 'Safe mode',
              value: 'safe' as const,
              description: 'Restore the recommended checkpoint policy for this project state',
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
                context,
                value === 'step' ? 'step' : 'plan',
              )
              syncWorkflowRuntimeState(getCtProjectRoot(), context.setAppState)
              if (!execution.ok) {
                onDone(execution.message, { display: 'system' })
                return
              }

              onDone(execution.message, {
                display: 'system',
                ...(execution.shouldQuery
                  ? {
                      shouldQuery: execution.shouldQuery,
                      metaMessages: execution.metaMessages,
                      nextInput: execution.nextInput,
                      submitNextInput: true,
                    }
                  : {}),
              })
              return
            }

            if (value === 'safe' || value === 'dangerous') {
              const changed = await setAutoworkRunMode(
                entryPoint,
                value === 'safe' ? 'safe' : 'dangerous',
              )
              onDone(changed.message, { display: 'system' })
              return
            }

            const resolved = await resolveAutoworkInspectionContext(entryPoint)
            if (!resolved.ok) {
              onDone(resolved.message, { display: 'system' })
              return
            }

            onDone(
              value === 'doctor'
                ? formatAutoworkDoctorSummary(
                    resolved.context,
                    resolved.planSource,
                  )
                : formatAutoworkStatusSummary(
                    entryPoint,
                    resolved.context,
                    resolved.planSource,
                  ),
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
  return async (onDone, context, args) => {
    const rawArgs = args?.trim() || ''
    const { head, tail } = splitCommandArgs(rawArgs)
    const normalizedArgs = rawArgs.toLowerCase()

    if (COMMON_HELP_ARGS.includes(normalizedArgs)) {
      const baseName = entryPoint === 'swim' ? '/swim' : '/autowork'
      onDone(
        [
          `${baseName} is tracked-plan orchestration, not the existing permission auto mode.`,
          '',
          'Available now:',
          `- ${baseName}`,
          `- ${baseName} safe`,
          `- ${baseName} dangerous`,
          `- ${baseName} use <path>`,
          `- ${baseName} run`,
          `- ${baseName} run 8h`,
          `- ${baseName} cloud run 8h`,
          `- ${baseName} step`,
          `- ${baseName} cloud local run 8h`,
          `- ${baseName} cloud <ssh-host> run 8h`,
          `- ${baseName} status`,
          `- ${baseName} doctor`,
          `- ${baseName} verify`,
          '',
          `${baseName} run carries the approved tracked plan to completion, one guarded chunk at a time.`,
          `${baseName} run 8h or ${baseName} run for 8 hours carries the plan inside a bounded autowork window.`,
          `When that bounded run enters a long-lived lifecycle wave and cloud offload is deterministic, SeaTurtle can auto-offload it into supervised background execution.`,
          `${baseName} step executes only one guarded chunk, then stops after verification.`,
          'Dangerous mode is heavily discouraged and is a separate operator choice that relaxes selected checkpoint failures into recorded debt.',
        ].join('\n'),
        { display: 'system' },
      )
      return null
    }

    if (head === 'safe' && !tail) {
      const changed = await setAutoworkRunMode(entryPoint, 'safe')
      onDone(changed.message, { display: 'system' })
      return null
    }

    if (head === 'dangerous' && !tail) {
      const changed = await setAutoworkRunMode(entryPoint, 'dangerous')
      onDone(changed.message, { display: 'system' })
      return null
    }

    if (head === 'use') {
      const selection = await selectAutoworkPlan(entryPoint, tail)
      onDone(selection.message, { display: 'system' })
      return null
    }

    if (head === 'cloud') {
      const launched = await launchCloudOffload(entryPoint, context, tail)
      onDone(launched.message, { display: 'system' })
      return null
    }

    if (head === 'run') {
      const parsedTail = parseAutoworkRunTail(tail)
      if (!parsedTail.ok) {
        onDone(parsedTail.message, { display: 'system' })
        return null
      }

      const execution = await runAutowork(entryPoint, context, 'plan', parsedTail.timeBudgetMs)
      syncWorkflowRuntimeState(getCtProjectRoot(), context.setAppState)
      onDone(execution.message, execution.ok
        ? {
            display: 'system',
            ...(execution.shouldQuery
              ? {
                  shouldQuery: execution.shouldQuery,
                  metaMessages: execution.metaMessages,
                  nextInput: execution.nextInput,
                  submitNextInput: true,
                }
              : {}),
          }
        : { display: 'system' })
      return null
    }

    if (head === 'step') {
      const parsedTail = parseAutoworkRunTail(tail)
      if (!parsedTail.ok) {
        onDone(parsedTail.message, { display: 'system' })
        return null
      }

      const execution = await runAutowork(entryPoint, context, 'step', parsedTail.timeBudgetMs)
      syncWorkflowRuntimeState(getCtProjectRoot(), context.setAppState)
      onDone(execution.message, execution.ok
        ? {
            display: 'system',
            ...(execution.shouldQuery
              ? {
                  shouldQuery: execution.shouldQuery,
                  metaMessages: execution.metaMessages,
                  nextInput: execution.nextInput,
                  submitNextInput: true,
                }
              : {}),
          }
        : { display: 'system' })
      return null
    }

    if (head === 'verify' && !tail) {
      const verification = await verifyAutowork(entryPoint)
      syncWorkflowRuntimeState(getCtProjectRoot(), context.setAppState)
      onDone(verification.message, verification.ok && verification.nextInput
        ? {
            display: 'system',
            nextInput: verification.nextInput,
            submitNextInput: true,
          }
        : { display: 'system' })
      return null
    }

    if ((head === 'status' || head === 'doctor') && !tail) {
      const resolved = await resolveAutoworkInspectionContext(entryPoint)
      if (!resolved.ok) {
        onDone(resolved.message, { display: 'system' })
        return null
      }

      onDone(
        head === 'doctor'
          ? formatAutoworkDoctorSummary(
              resolved.context,
              resolved.planSource,
            )
          : formatAutoworkStatusSummary(
              entryPoint,
              resolved.context,
              resolved.planSource,
            ),
        { display: 'system' },
      )
      return null
    }

    if (rawArgs === '' || normalizedArgs === 'start') {
      if (context.options.isNonInteractiveSession) {
        onDone(buildNonInteractiveUsage(entryPoint), { display: 'system' })
        return null
      }
      return <AutoworkMenu entryPoint={entryPoint} onDone={onDone} context={context} />
    }

    onDone(
      [
        `Unknown ${titleForEntryPoint(entryPoint).toLowerCase()} option.`,
        '',
        `Use /${entryPoint} for the menu, or one of:`,
        `- /${entryPoint} safe`,
        `- /${entryPoint} dangerous`,
        `- /${entryPoint} use <path>`,
        `- /${entryPoint} run`,
        `- /${entryPoint} run 8h`,
        `- /${entryPoint} cloud run 8h`,
        `- /${entryPoint} step`,
        `- /${entryPoint} cloud local run 8h`,
        `- /${entryPoint} cloud <ssh-host> run 8h`,
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
