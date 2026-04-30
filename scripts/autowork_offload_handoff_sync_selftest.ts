import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  createWorkstreamId,
  readActiveWorkflowHandoffPacket,
  startActiveWorkstream,
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

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const cliPath = join(projectRoot, 'dist', 'cli.js')
  const tempRoot = mkdtempSync(join(tmpdir(), 'ct-offload-handoff-sync-'))

  try {
    const sourceRepo = join(tempRoot, 'source')
    const targetRepo = join(tempRoot, 'target')
    mkdirSync(sourceRepo, { recursive: true })
    mkdirSync(targetRepo, { recursive: true })

    runChecked('git', ['init'], sourceRepo)
    runChecked('git', ['init'], targetRepo)

    const workId = createWorkstreamId('Remote handoff sync', Date.now())
    startActiveWorkstream(
      {
        workId,
        title: 'Remote handoff sync',
        summary: 'Remote-host status should emit an authoritative child handoff packet.',
        currentPhase: 'research',
        phaseReason: 'Research is active before execution.',
        intentSummary: 'Remote offload should sync workflow truth back home.',
      },
      sourceRepo,
    )

    const handoff = readActiveWorkflowHandoffPacket(sourceRepo)
    assert.ok(handoff, 'expected a workflow handoff packet from the source repo')

    const handoffFile = join(tempRoot, 'handoff.json')
    writeFileSync(handoffFile, JSON.stringify(handoff, null, 2))

    const result = spawnSync(
      'node',
      [
        cliPath,
        '--print',
        '--output-format',
        'stream-json',
        '--verbose',
        '--emit-workflow-handoff-stream',
        '--workflow-handoff-file',
        handoffFile,
        '--replace-workflow-handoff',
        '/autowork status',
      ],
      {
        cwd: targetRepo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    assert.equal(
      result.status,
      0,
      `headless workflow handoff stream check failed:\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`,
    )

    const lines = result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(
        line =>
          JSON.parse(line) as {
            type?: string
            subtype?: string
            workflow_handoff?: {
              sourceRoot?: string | null
              resolution?: {
                phase?: string | null
              }
            }
          },
      )

    const workflowLine = lines.find(
      line =>
        line.type === 'system' &&
        line.subtype === 'workflow_handoff' &&
        line.workflow_handoff,
    )

    assert.ok(
      workflowLine?.workflow_handoff,
      'expected headless autowork status to emit a workflow_handoff system record',
    )
    assert.equal(
      workflowLine.workflow_handoff?.sourceRoot
        ? realpathSync(workflowLine.workflow_handoff.sourceRoot)
        : workflowLine.workflow_handoff?.sourceRoot,
      realpathSync(targetRepo),
      'expected emitted workflow handoff to come from the child offload repo',
    )
    assert.equal(
      workflowLine.workflow_handoff?.resolution?.phase,
      'research',
      'expected emitted workflow handoff to preserve the active workflow phase',
    )
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

run()

console.log('autowork offload handoff sync selftest passed')
