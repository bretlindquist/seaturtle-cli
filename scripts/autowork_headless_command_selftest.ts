import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function runCli(projectRoot: string, cwd: string, prompt: string): string {
  const cliPath = join(projectRoot, 'dist', 'cli.js')
  const result = spawnSync(
    'node',
    [cliPath, '--print', '--output-format', 'stream-json', '--verbose', prompt],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  assert.equal(
    result.status,
    0,
    `headless autowork command failed for ${prompt}:\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`,
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
          result?: string
          message?: {
            content?: Array<{
              type?: string
              text?: string
            }>
          }
        },
    )

  const resultMessage = lines.find(
    message => message.type === 'result' && message.subtype === 'success',
  )
  assert.ok(resultMessage, `expected a result message for ${prompt}`)

  if (resultMessage?.result?.trim()) {
    return resultMessage.result.trim()
  }

  const assistantText = [...lines]
    .reverse()
    .find(
      message =>
        message.type === 'assistant' &&
        message.message?.content?.[0]?.type === 'text' &&
        message.message.content[0].text?.trim(),
    )?.message?.content?.[0]?.text

  assert.ok(assistantText, `expected visible command text for ${prompt}`)
  return assistantText!.trim()
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const tempRoot = mkdtempSync(join(tmpdir(), 'ct-headless-autowork-'))

  try {
    const repoRoot = join(tempRoot, 'repo')
    mkdirSync(repoRoot, { recursive: true })

    const initResult = spawnSync('git', ['init'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    assert.equal(initResult.status, 0, initResult.stderr)

    const usage = runCli(projectRoot, repoRoot, '/autowork')
    assert.match(
      usage,
      /available in headless mode only with an explicit action/i,
    )

    const runGuidance = runCli(projectRoot, repoRoot, '/autowork run')
    assert.match(
      runGuidance,
      /Then rerun \/autowork run after the tracked plan is ready\./,
    )
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

run()

console.log('autowork headless command selftest passed')
