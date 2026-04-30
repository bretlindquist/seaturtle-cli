import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createWorkstreamId,
  startActiveWorkstream,
  updateWorkExecutionPacket,
} from '../source/src/services/projectIdentity/workflowState.js'

function runChecked(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed:\n${result.stderr}`,
  )
}

function runCli(
  projectRoot: string,
  sourceRepo: string,
  targetRepo: string,
  action: 'status' | 'doctor',
  workflowHandoffOutputFile?: string,
): string {
  const cliPath = join(projectRoot, 'dist', 'cli.js')
  const result = spawnSync(
    'node',
    [
      cliPath,
      'ssh-autowork',
      '--local',
      '--dir',
      targetRepo,
      '--action',
      action,
      ...(workflowHandoffOutputFile
        ? ['--workflow-handoff-output-file', workflowHandoffOutputFile]
        : []),
    ],
    {
      cwd: sourceRepo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  assert.equal(
    result.status,
    0,
    `ssh-autowork ${action} failed:\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`,
  )

  return result.stdout.trim()
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const tempRoot = mkdtempSync(join(tmpdir(), 'ct-ssh-autowork-'))

  try {
    const sourceRepo = join(tempRoot, 'source')
    const targetRepo = join(tempRoot, 'target')
    mkdirSync(sourceRepo, { recursive: true })
    mkdirSync(targetRepo, { recursive: true })

    runChecked('git', ['init'], sourceRepo)
    runChecked('git', ['init'], targetRepo)

    const workId = createWorkstreamId('Remote autowork', Date.now())
    startActiveWorkstream(
      {
        workId,
        title: 'Remote autowork',
        summary: 'Remote-host lifecycle supervision',
        currentPhase: 'research',
        phaseReason: 'Research remains active before implementation.',
        intentSummary: 'Remote offload should preserve authoritative workflow state.',
      },
      sourceRepo,
    )
    updateWorkExecutionPacket(
      current => ({
        ...current,
        heartbeatEnabled: true,
        heartbeatIntervalMs: 10 * 60 * 1000,
        swarmBackend: 'cloud',
        swarmActive: false,
      }),
      sourceRepo,
    )

    const handoffFile = join(tempRoot, 'handoff.json')
    const status = runCli(
      projectRoot,
      sourceRepo,
      targetRepo,
      'status',
      handoffFile,
    )
    assert.match(status, /Workflow phase: research/)
    assert.match(status, /Heartbeat: on \(/)
    assert.match(status, /Cloud offload:/)
    const handoff = JSON.parse(readFileSync(handoffFile, 'utf8')) as {
      resolution?: { phase?: string }
      packets?: { execution?: { heartbeatEnabled?: boolean } }
    }
    assert.equal(handoff.resolution?.phase, 'research')
    assert.equal(handoff.packets?.execution?.heartbeatEnabled, true)

    const doctor = runCli(projectRoot, sourceRepo, targetRepo, 'doctor')
    assert.match(doctor, /Autowork doctor/)
    assert.match(doctor, /Workflow phase: research/)
    assert.match(doctor, /Plan: none yet/)
    assert.match(doctor, /Backend policy:/)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

run()

console.log('ssh autowork offload selftest passed')
