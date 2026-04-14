import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function run(): void {
  const screenSource = readFileSync(
    join(process.cwd(), 'source/src/ink/screen.ts'),
    'utf8',
  )

  assert(
    screenSource.includes("\\x1b[48;2;111;211;197m"),
    'expected current transcript match highlight source to use the SeaTurtle sea-green background',
  )
  assert(
    screenSource.includes("\\x1b[30m"),
    'expected current transcript match highlight source to force readable foreground text',
  )
}

run()
