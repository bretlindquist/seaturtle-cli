import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dir, '..')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function run(): void {
  const intervalHook = readFileSync(
    join(repoRoot, 'source/src/ink/hooks/use-interval.ts'),
    'utf8',
  )
  const gameCommand = readFileSync(
    join(repoRoot, 'source/src/commands/game/game.tsx'),
    'utf8',
  )

  assert(
    /export function useInterval\(\s*callback: \(\) => void,\s*intervalMs: number \| null,\s*keepAlive = false,/s.test(
      intervalHook,
    ),
    'useInterval should support an explicit keepAlive flag',
  )

  assert(
    /clock\.subscribe\(onChange,\s*keepAlive\)/.test(intervalHook),
    'useInterval should pass keepAlive through to the shared clock subscription',
  )

  const keepAliveSceneTimers = gameCommand.match(/useInterval\([\s\S]*?,\s*true,\s*\)/g) ?? []
  assert(
    keepAliveSceneTimers.length >= 2,
    'Swords of Chaos scene timers should opt into keepAlive clock ticks',
  )
}

run()
