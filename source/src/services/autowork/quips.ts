// Keep autowork/swim launch voice distinct from ordinary CT banter.
// Internal note: docs/internal/CT-VOICE-GUIDANCE.md
const AUTOWORK_QUIPS = [
  "Built for speed but the roads can't hold me. Let's do this.",
  'Hold on to your butts. Engaging hyperdrive.',
  'Ludicrous speed. Aye aye, captain.',
  'One small step for CT, one giant step for the project.',
  'Houston, we have liftoff.',
  'Vector set. Commencing chunk run.',
  'Throttle steady. Shell forward. No drift.',
  'Track locked. Gates armed. Running the plan through clean chunk after clean chunk.',
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

const DANGEROUS_AUTOWORK_QUIPS = [
  'Dangerous mode armed. Keep the scope tighter than your heartbeat.',
  'Manual override accepted. Precision first, swagger second.',
  'Shell hot. Gates loosened. Accountability stays on.',
  'This road has fewer guardrails. Drive like you mean it.',
] as const

const DANGEROUS_SWIM_QUIPS = [
  'Dangerous swim engaged. Mighty fins, tighter judgment.',
  'Deep water now. Professional turtle rules still apply.',
  'The tide just got rougher. Stay deliberate.',
  'Whimsy above water, steel underneath. Dangerous swim armed.',
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

export function getAutoworkDangerousQuip(
  entrypoint: 'autowork' | 'swim',
  seed: string,
): string {
  return pickQuip(
    entrypoint === 'swim' ? DANGEROUS_SWIM_QUIPS : DANGEROUS_AUTOWORK_QUIPS,
    seed,
  )
}
