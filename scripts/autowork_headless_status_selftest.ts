import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createWorkstreamId,
  readActiveWorkflowHandoffPacket,
  startActiveWorkstream,
  updateWorkExecutionPacket,
} from '../source/src/services/projectIdentity/workflowState.js'

function runChecked(command: string, args: string[], cwd: string): string {
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

  return result.stdout
}

function runCli(
  projectRoot: string,
  repoRoot: string,
  handoffFile: string,
  flag: '--autowork-status' | '--autowork-doctor',
): string {
  const cliPath = join(projectRoot, 'dist', 'cli.js')
  const result = spawnSync(
    'node',
    [
      cliPath,
      '--print',
      '--verbose',
      '--output-format',
      'stream-json',
      flag,
      '--workflow-handoff-file',
      handoffFile,
      '--replace-workflow-handoff',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  assert.equal(
    result.status,
    0,
    `headless autowork inspection failed for ${flag}:\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`,
  )

  const line = result.stdout
    .split('\n')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => JSON.parse(value) as { type?: string; subtype?: string; result?: string })
    .find(value => value.type === 'result')

  assert.ok(line, `expected a result message for ${flag}`)
  assert.equal(line.subtype, 'success', `expected success result for ${flag}`)
  assert.equal(typeof line.result, 'string', `expected text result for ${flag}`)

  return line.result as string
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const tempRoot = mkdtempSync(join(tmpdir(), 'ct-autowork-headless-'))

  try {
    const sourceRepo = join(tempRoot, 'source')
    const targetRepo = join(tempRoot, 'target')
    mkdirSync(sourceRepo, { recursive: true })
    mkdirSync(targetRepo, { recursive: true })

    runChecked('git', ['init'], sourceRepo)
    runChecked('git', ['init'], targetRepo)

    const workId = createWorkstreamId('Remote orchestration', Date.now())
    startActiveWorkstream(
      {
        workId,
        title: 'Remote orchestration',
        summary: 'Research-first remote autowork bootstrap',
        currentPhase: 'research',
        phaseReason: 'Research is active before implementation.',
        intentSummary: 'Remote autowork should preserve workflow truth.',
      },
      sourceRepo,
    )
    updateWorkExecutionPacket(
      current => ({
        ...current,
        heartbeatEnabled: true,
        heartbeatIntervalMs: 15 * 60 * 1000,
        swarmBackend: 'cloud',
        swarmActive: false,
      }),
      sourceRepo,
    )

    const handoff = readActiveWorkflowHandoffPacket(sourceRepo)
    assert.ok(handoff, 'expected a workflow handoff packet from the source repo')

    const handoffFile = join(tempRoot, 'handoff.json')
    writeFileSync(handoffFile, JSON.stringify(handoff, null, 2))

    const status = runCli(
      projectRoot,
      targetRepo,
      handoffFile,
      '--autowork-status',
    )
    assert.match(status, /Workflow phase: research/)
    assert.match(status, /Heartbeat: on \(/)
    assert.match(status, /Cloud offload:/)

    const doctor = runCli(
      projectRoot,
      targetRepo,
      handoffFile,
      '--autowork-doctor',
    )
    assert.match(doctor, /Autowork doctor/)
    assert.match(doctor, /Workflow phase: research/)
    assert.match(doctor, /Backend policy:/)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

run()

console.log('autowork headless status selftest passed')
