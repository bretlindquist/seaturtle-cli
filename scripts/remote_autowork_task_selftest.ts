import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function runCli(projectRoot: string, cwd: string, statusFile: string): string {
  const cliPath = join(projectRoot, 'dist', 'cli.js')
  const result = spawnSync(
    'node',
    [
      cliPath,
      'ssh-autowork',
      '--local',
      '--dir',
      cwd,
      '--action',
      'status',
      '--background-status-file',
      statusFile,
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  assert.equal(
    result.status,
    0,
    `ssh-autowork status failed:\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`,
  )

  return result.stdout.trim()
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const taskSource = read(
    projectRoot,
    'source/src/tasks/RemoteAutoworkTask/RemoteAutoworkTask.ts',
  )

  assert.match(
    taskSource,
    /export async function launchRemoteAutoworkTask/,
    'expected a dedicated remote autowork background launcher',
  )
  assert.match(
    taskSource,
    /export async function restoreRemoteAutoworkTasks/,
    'expected remote autowork restore to be wired through the task seam',
  )
  assert.match(
    taskSource,
    /detached:\s*true/,
    'expected remote autowork launcher to spawn detached child processes',
  )
  assert.match(
    taskSource,
    /writeRemoteAutoworkMetadata/,
    'expected remote autowork launcher to persist sidecar metadata',
  )
  assert.match(
    taskSource,
    /listRemoteAutoworkMetadata/,
    'expected remote autowork restore to read sidecar metadata',
  )
  assert.match(
    taskSource,
    /updateWorkExecutionPacket/,
    'expected remote autowork supervision to project cloud activity into the workflow execution packet',
  )
  assert.match(
    taskSource,
    /syncWorkflowRuntimeState/,
    'expected remote autowork supervision to refresh footer/runtime projection after packet updates',
  )

  const lifecycleSource = read(
    projectRoot,
    'source/src/screens/repl/useReplSessionLifecycle.ts',
  )
  assert.match(
    lifecycleSource,
    /restoreRemoteAutoworkTasks/,
    'expected REPL lifecycle to restore remote autowork tasks on mount',
  )

  const resumeSource = read(
    projectRoot,
    'source/src/screens/repl/finishReplSessionResume.ts',
  )
  assert.match(
    resumeSource,
    /restoreRemoteAutoworkTasks/,
    'expected resume flow to restore remote autowork tasks',
  )

  const tempRoot = mkdtempSync(join(tmpdir(), 'ct-remote-autowork-'))
  const statusFile = join(tempRoot, 'status.json')

  try {
    const stdout = runCli(projectRoot, projectRoot, statusFile)
    assert.match(stdout, /Autowork status|Workflow phase:/)

    const status = JSON.parse(readFileSync(statusFile, 'utf8')) as {
      success: boolean
      exitCode: number
      output: string
      mode: string
      remoteCwd: string
    }

    assert.equal(status.success, true)
    assert.equal(status.exitCode, 0)
    assert.equal(status.mode, 'local')
    assert.match(status.output, /Autowork status|Workflow phase:/)
    assert.equal(status.remoteCwd, projectRoot)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

run()

console.log('remote autowork task selftest passed')
