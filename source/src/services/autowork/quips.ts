const AUTOWORK_QUIPS = [
  "Built for speed but the roads can't hold me. Let's do this.",
  'Hold on to your butts. Engaging hyperdrive.',
  'Ludicrous speed. Aye aye, captain.',
  'One small step for CT, one giant step for the project.',
  'Houston, we have liftoff.',
  'Vector set. Commencing chunk run.',
  'Throttle steady. Shell forward. No drift.',
  'Track locked. Gates armed. Advancing one chunk at a time.',
  'Serious plan. Serious checkpoints. Serious speed.',
] as const

const SWIM_QUIPS = [
  'The tide is right. Starting swim mode.',
  'Sea you on the other side of this chunk.',
  'A mighty turtle swims with intent, not panic.',
  'Professional shell. Whimsical fins. Same mission.',
  "Current locked. Shell polished. Let's move.",
  'A serious turtle can still make a splash.',
  'Tide set. Scope tight. Fins out.',
  'Whimsy on the surface. Determinism underneath.',
  'Mighty turtle energy. Surgical execution.',
] as const

function pickQuip(quips: readonly string[], seed: string): string {
  let score = 0
  for (const char of seed) {
    score += char.charCodeAt(0)
  }

  return quips[score % quips.length]!
}

export function getAutoworkLaunchQuip(
  entrypoint: 'autowork' | 'swim',
  seed: string,
): string {
  return pickQuip(entrypoint === 'swim' ? SWIM_QUIPS : AUTOWORK_QUIPS, seed)
}
