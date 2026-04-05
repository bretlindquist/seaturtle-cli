import { getCtArchives } from './archives.js'

export type CtConversationPosture = 'work' | 'companion' | 'supportive'

export type CtDisposition =
  | 'brisk'
  | 'curious'
  | 'mischievous'
  | 'steady'
  | 'warm'
  | 'reflective'

export type CtConversationPostureResult = {
  posture: CtConversationPosture
  disposition: CtDisposition
  addendum: string
}

const DEFAULT_CT_TEMPERAMENT = ['brisk', 'mischievous', 'curious'] as const

const COMPANION_MARKERS = [
  'just chat',
  'just talking',
  'can we talk',
  'lets talk',
  "let's talk",
  'not work',
  'banter',
  'tangent',
  'philosophy',
  'philosophical',
  'consciousness',
  'meaning of life',
  'the world',
  'existence',
  'what do you think',
  'i wonder',
  'curious about',
  'explore this with me',
] as const

const SUPPORTIVE_MARKERS = [
  'tired',
  'exhausted',
  'overwhelmed',
  'burned out',
  'burnt out',
  'stressed',
  'rough day',
  'hard day',
  'family stress',
  'sick',
  'scared',
  'lonely',
  'sad',
  'grief',
  'grieving',
  'at the end of my rope',
  'losing it',
  'going mental',
  'spiraling',
  'hopeless',
  'miserable',
  'discouraged',
] as const

const WORK_MARKERS = [
  '/autowork',
  '/swim',
  '/ct',
  '/lolcat',
  '/game',
  'implement',
  'fix',
  'patch',
  'commit',
  'push',
  'lint',
  'build',
  'test',
  'review',
  'refactor',
  'repo',
  'branch',
  'typescript',
  'tsx',
  'javascript',
  'function',
  'component',
  'prompt path',
  'query',
  'command',
  'error',
  'bug',
  'regression',
  'file',
  'diff',
  'validation',
  'script',
  'worktree',
] as const

function hashSeed(seed: string): number {
  let score = 0
  for (const char of seed) {
    score = (score * 33 + char.charCodeAt(0)) >>> 0
  }
  return score
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeTemperament(
  temperament: readonly string[],
  posture: CtConversationPosture,
): CtDisposition[] {
  const mapped = temperament
    .map(value => normalizeText(value))
    .flatMap<CtDisposition>(value => {
      switch (value) {
        case 'brisk':
        case 'curious':
        case 'mischievous':
        case 'steady':
        case 'warm':
        case 'reflective':
          return [value]
        default:
          return []
      }
    })

  if (mapped.length > 0) {
    if (posture === 'supportive' && !mapped.includes('steady')) {
      return [...mapped, 'steady', 'warm']
    }
    if (posture === 'companion' && !mapped.includes('reflective')) {
      return [...mapped, 'reflective']
    }
    return mapped
  }

  return posture === 'supportive'
    ? ['steady', 'warm']
    : [...DEFAULT_CT_TEMPERAMENT]
}

export function pickCtDisposition(
  seed: string,
  options?: {
    temperament?: readonly string[]
    posture?: CtConversationPosture
  },
): CtDisposition {
  const posture = options?.posture ?? 'work'
  const pool = normalizeTemperament(
    options?.temperament ?? DEFAULT_CT_TEMPERAMENT,
    posture,
  )
  return pool[hashSeed(seed) % pool.length] ?? 'curious'
}

function includesAny(text: string, markers: readonly string[]): boolean {
  return markers.some(marker => text.includes(marker))
}

function countMatches(texts: readonly string[], markers: readonly string[]): number {
  return texts.reduce(
    (count, value) => (includesAny(value, markers) ? count + 1 : count),
    0,
  )
}

function looksLikeWorkInput(text: string): boolean {
  return (
    text.startsWith('/') ||
    text.startsWith('!') ||
    includesAny(text, WORK_MARKERS) ||
    /`[^`]+`/.test(text) ||
    /\b[a-z0-9/_-]+\.(ts|tsx|js|jsx|md|json|sh)\b/.test(text)
  )
}

export function classifyCtConversationPosture(input: {
  currentInput: string
  recentUserMessages?: readonly string[]
}): CtConversationPosture {
  const current = normalizeText(input.currentInput)
  const recent = (input.recentUserMessages ?? [])
    .map(normalizeText)
    .filter(Boolean)
    .slice(-3)

  if (!current) {
    return 'work'
  }

  if (
    includesAny(current, SUPPORTIVE_MARKERS) ||
    countMatches(recent, SUPPORTIVE_MARKERS) >= 2
  ) {
    return 'supportive'
  }

  const explicitCompanion =
    includesAny(current, COMPANION_MARKERS) ||
    current.endsWith('?') &&
      !looksLikeWorkInput(current) &&
      (current.includes('life') ||
        current.includes('world') ||
        current.includes('people') ||
        current.includes('consciousness') ||
        current.includes('philosophy'))

  if (explicitCompanion) {
    return 'companion'
  }

  if (
    !looksLikeWorkInput(current) &&
    recent.length >= 2 &&
    countMatches(recent, WORK_MARKERS) === 0
  ) {
    return 'companion'
  }

  return 'work'
}

function getDispositionFlavor(disposition: CtDisposition): string {
  switch (disposition) {
    case 'brisk':
      return 'Be crisp, lively, and forward-moving without becoming abrupt.'
    case 'curious':
      return 'Lead with curiosity and shared discovery.'
    case 'mischievous':
      return 'Allow a light playful edge, but keep the work clearer than the joke.'
    case 'steady':
      return 'Stay grounded, calm, and reliable.'
    case 'warm':
      return 'Let the tone be gently warm without becoming sentimental.'
    case 'reflective':
      return 'Give the exchange a thoughtful, spacious cadence.'
  }
}

export function buildCtConversationPostureAddendum(input: {
  posture: CtConversationPosture
  disposition: CtDisposition
}): string {
  const flavor = getDispositionFlavor(input.disposition)

  switch (input.posture) {
    case 'supportive':
      return `# CT Conversation Posture

Current posture: supportive
Current SeaTurtle disposition: ${input.disposition}

The user may be strained, discouraged, tired, or carrying something heavy.

- Be steady, warm, and low-ego.
- Do not therapize, minimize, or pressure the user to be productive.
- Keep the response smaller and gentler than a full technical dump.
- If a question helps, make it simple and humane.
- Avoid piling jokes onto a difficult moment.
- ${flavor}`
    case 'companion':
      return `# CT Conversation Posture

Current posture: companion
Current SeaTurtle disposition: ${input.disposition}

The user appears to want conversation, exploration, or banter rather than pure execution.

- Conversation is back-and-forth; do not dump everything at once.
- Start small, then build with the user's replies.
- Sometimes return with a thoughtful question instead of a complete answer.
- Be curious, engaging, approachable, and lightly Socratic.
- Allow tangents when the tangent is the point.
- Do not force the exchange back into task framing.
- ${flavor}`
    case 'work':
      return `# CT Conversation Posture

Current posture: work
Current SeaTurtle disposition: ${input.disposition}

- Stay practical, compact, and useful first.
- Keep warmth in the tone, but do not let personality bury the work.
- Prefer the next clear step over an exhaustive monologue unless the user asks for depth.
- ${flavor}`
  }
}

export function getCtConversationPostureResult(input: {
  currentInput: string
  recentUserMessages?: readonly string[]
  seed?: string
}): CtConversationPostureResult {
  const posture = classifyCtConversationPosture({
    currentInput: input.currentInput,
    recentUserMessages: input.recentUserMessages,
  })
  const temperament = getCtArchives().temperament
  const disposition = pickCtDisposition(
    input.seed ?? `${input.currentInput}:${Date.now()}`,
    {
      temperament,
      posture,
    },
  )

  return {
    posture,
    disposition,
    addendum: buildCtConversationPostureAddendum({
      posture,
      disposition,
    }),
  }
}
