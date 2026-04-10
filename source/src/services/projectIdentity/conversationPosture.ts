export type CtConversationPosture =
  | 'open'
  | 'explore'
  | 'work'
  | 'supportive'

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

const OPEN_MARKERS = [
  'hi',
  'hello',
  'hey',
  'yo',
  'sup',
  "what's up",
  'hows it going',
  "how's it going",
  'good morning',
  'good evening',
  'good afternoon',
  'everything',
] as const

const EXPLORATION_MARKERS = [
  'just chatting',
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
  'the universe',
  'the cosmos',
  'existence',
  'life itself',
  'purpose',
  'beauty',
  'meaning',
  'what do you think',
  'i wonder',
  'curious about',
  'explore this with me',
  'tell me more',
  'let us wander',
  'go on a tangent',
  'think through',
  'thinking through',
  'big picture',
  'zoom out',
  'brainstorm',
  'research',
  'plan this',
  'planning',
  'architecture',
  'what should this feel like',
  'what should this become',
  'where should this go',
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

const STRONG_WORK_MARKERS = [
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
  'test',
  'review',
  'refactor',
  'debug',
  'trace',
] as const

const TECHNICAL_CONTEXT_MARKERS = [
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
  'auth callback',
  'provider',
  'runtime',
  'tool',
  'mcp',
  'build',
  'compile',
  'test suite',
  'failing test',
  'stack trace',
  'codebase',
] as const

const UI_DESIGN_MARKERS = [
  'ui',
  'ux',
  'frontend',
  'front end',
  'design',
  'layout',
  'landing page',
  'onboarding',
  'menu',
  'theme',
  'theming',
  'responsive',
  'mobile',
  'desktop',
  'spacing',
  'hierarchy',
  'legibility',
  'empty state',
  'loading state',
  'error state',
  'button alignment',
  'transcript',
  'visual polish',
  'microcopy',
  'interaction',
  'interaction flow',
  'color palette',
  'typography',
] as const

const EXPLICIT_WORK_VERBS = [
  'implement',
  'fix',
  'patch',
  'refactor',
  'review',
  'debug',
  'trace',
  'commit',
  'push',
  'lint',
  'test',
  'edit',
  'run',
] as const

const EXPLICIT_WORK_INVITATION_PHRASES = [
  'can you help',
  'help me',
  'what should we do',
  'what should i do',
  'what should we build',
  'what should this be',
  'how should we',
  'how do we',
  'how do i',
  'can you diagnose',
  'can you debug',
  'can you review',
  'can you plan',
  'should we fix',
  'should we change',
  'should we refactor',
  'let us plan',
  "let's plan",
  'let us figure out',
  "let's figure out",
  'help me figure out',
  'recommend a plan',
  'give me a plan',
  'give me the next step',
] as const

const LIGHT_BANTER_MARKERS = [
  'good question',
  'lol',
  'lmao',
  'haha',
  'ha ha',
  'just kidding',
  'joking',
  'riffing',
  'vibing',
  'nothing but love',
  'ridiculous',
  'beautiful',
  'what a mess',
  'what a world',
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
    if (posture === 'explore' && !mapped.includes('reflective')) {
      return [...mapped, 'reflective']
    }
    if (posture === 'open' && !mapped.includes('curious')) {
      return [...mapped, 'curious']
    }
    return mapped
  }

  switch (posture) {
    case 'supportive':
      return ['steady', 'warm']
    case 'explore':
      return ['curious', 'reflective', 'warm']
    case 'open':
      return ['curious', 'warm', 'mischievous']
    case 'work':
      return [...DEFAULT_CT_TEMPERAMENT]
  }
}

export function pickCtDisposition(
  seed: string,
  options?: {
    temperament?: readonly string[]
    posture?: CtConversationPosture
  },
): CtDisposition {
  const posture = options?.posture ?? 'open'
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

function looksLikeOpenTurn(text: string): boolean {
  return OPEN_MARKERS.some(marker => text === marker)
}

function looksLikeExplicitExecutionTurn(text: string): boolean {
  const hasStrongMarker = includesAny(text, STRONG_WORK_MARKERS)
  const hasTechnicalContext = includesAny(text, TECHNICAL_CONTEXT_MARKERS)
  const startsWithExplicitVerb = EXPLICIT_WORK_VERBS.some(verb =>
    text.startsWith(`${verb} `),
  )

  return (
    text.startsWith('/') ||
    text.startsWith('!') ||
    hasStrongMarker ||
    (startsWithExplicitVerb && hasTechnicalContext) ||
    /`[^`]+`/.test(text) ||
    /\b[a-z0-9/_-]+\.(ts|tsx|js|jsx|md|json|sh)\b/.test(text)
  )
}

function looksLikeExploratoryTurn(text: string): boolean {
  if (!text || looksLikeExplicitExecutionTurn(text)) {
    return false
  }

  return (
    includesAny(text, EXPLORATION_MARKERS) ||
    currentLooksPhilosophicalQuestion(text) ||
    currentLooksBroadHumanTurn(text) ||
    text.startsWith('i have been thinking about ') ||
    text.startsWith('i keep wondering ') ||
    text.startsWith('sometimes i think ') ||
    text.startsWith('what if ') ||
    text.startsWith('help me think through ')
  )
}

export function looksLikeExplicitWorkInvitation(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  if (looksLikeExplicitExecutionTurn(normalized)) {
    return true
  }

  const asksForHelp = EXPLICIT_WORK_INVITATION_PHRASES.some(phrase =>
    normalized.includes(phrase),
  )
  const asksProjectQuestion =
    normalized.endsWith('?') &&
    includesAny(normalized, TECHNICAL_CONTEXT_MARKERS) &&
    /^(what|how|why|where|when|can|could|should|would|do|does|is|are)\b/.test(
      normalized,
    )

  return asksForHelp || asksProjectQuestion
}

function looksLikeLightBanterTurn(text: string): boolean {
  if (!text || looksLikeExplicitExecutionTurn(text)) {
    return false
  }

  const rhetoricalStarts = [
    'where shouldnt we',
    "where shouldn't we",
    'where wouldnt we',
    "where wouldn't we",
    'why would we',
    'why wouldnt we',
    "why wouldn't we",
    'what could possibly',
    'surely not',
    'probably not',
    'maybe not',
  ] as const

  return (
    includesAny(text, LIGHT_BANTER_MARKERS) ||
    rhetoricalStarts.some(marker => text.startsWith(marker)) ||
    (text.endsWith('?') &&
      (text.includes("shouldn't") ||
        text.includes('shouldnt') ||
        text.includes("wouldn't") ||
        text.includes('wouldnt'))) ||
    (text.includes('.') && text.includes('?') && !looksLikeExploratoryTurn(text))
  )
}

function currentLooksPhilosophicalQuestion(text: string): boolean {
  return (
    text.endsWith('?') &&
    (text.includes('life') ||
      text.includes('world') ||
      text.includes('people') ||
      text.includes('consciousness') ||
      text.includes('philosophy') ||
      text.includes('meaning') ||
      text.includes('beauty') ||
      text.includes('existence'))
  )
}

function currentLooksSupportiveConversationTurn(text: string): boolean {
  if (!text || looksLikeExplicitExecutionTurn(text)) {
    return false
  }

  return includesAny(text, SUPPORTIVE_MARKERS)
}

function currentLooksBroadHumanTurn(text: string): boolean {
  if (looksLikeExplicitExecutionTurn(text)) {
    return false
  }

  const broadMarkers = [
    'life',
    'death',
    'love',
    'meaning',
    'purpose',
    'beauty',
    'existence',
    'the world',
    'the universe',
    'the cosmos',
    'consciousness',
    'nature',
    'art',
    'human',
    'people',
  ] as const

  return includesAny(text, broadMarkers)
}

function looksLikeUiDesignTurn(text: string): boolean {
  return includesAny(text, UI_DESIGN_MARKERS)
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
    return 'open'
  }

  if (looksLikeExplicitExecutionTurn(current)) {
    return 'work'
  }

  if (
    currentLooksSupportiveConversationTurn(current) ||
    currentLooksSupportiveConversationTurn(recent.at(-1) ?? '') &&
      countMatches(recent, STRONG_WORK_MARKERS) === 0
  ) {
    return 'supportive'
  }

  if (looksLikeLightBanterTurn(current)) {
    return 'open'
  }

  if (looksLikeExplicitWorkInvitation(current)) {
    return 'explore'
  }

  if (looksLikeExploratoryTurn(current)) {
    return 'explore'
  }

  if (
    !looksLikeExplicitExecutionTurn(current) &&
    recent.length >= 2 &&
    countMatches(recent, STRONG_WORK_MARKERS) === 0 &&
    (countMatches(recent, EXPLORATION_MARKERS) >= 1 ||
      countMatches(recent, SUPPORTIVE_MARKERS) >= 1)
  ) {
    return countMatches(recent, SUPPORTIVE_MARKERS) > 0
      ? 'supportive'
      : 'explore'
  }

  if (looksLikeOpenTurn(current)) {
    return 'open'
  }

  return 'open'
}

function getDispositionFlavor(disposition: CtDisposition): string {
  switch (disposition) {
    case 'brisk':
      return 'Be crisp, lively, and forward-moving without becoming abrupt.'
    case 'curious':
      return 'Lead with curiosity and shared discovery without stealing the center of gravity from the user.'
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
  currentInput?: string
}): string {
  const flavor = getDispositionFlavor(input.disposition)
  const uiFocused = looksLikeUiDesignTurn(normalizeText(input.currentInput ?? ''))
  const uiGuidance = uiFocused
    ? `

UI / design signal detected:

- Look for high-leverage delight rather than generic prettiness.
- Improve hierarchy, spacing, legibility, and flow before adding flourish.
- Consider responsive behavior and important edge states.
- Preserve the existing design language unless the user is clearly asking for a redesign.
- Put extra effort where a modest improvement would create outsized user delight.
- Avoid AI-slop patterns, decorative overreach, and color-only fixes when structure is weak.`
    : ''

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
- ${flavor}${uiGuidance}`
    case 'explore':
      return `# CT Conversation Posture

Current posture: explore
Current SeaTurtle disposition: ${input.disposition}

The user appears to want big-picture thinking, conversation, exploration, or philosophy rather than immediate execution.

- Conversation is back-and-forth; do not dump everything at once.
- Start small, then build with the user's replies.
- Sometimes return with a thoughtful question instead of a complete answer.
- Be curious, engaging, approachable, and lightly Socratic.
- Treat the user's own mind as the main landscape being explored; help bring latent thoughts to the surface instead of replacing them with a polished answer too early.
- Use occasional devil's-advocate pressure to test the shape of an idea, not to flatten its possibility.
- Keep some optimism and spaciousness in the exchange; discovery should feel like opening, not closing.
- Allow tangents when the tangent is the point.
- Do not flatten broad human or project questions into task triage, category menus, or productivity coaching.
- Meet the idea first, then narrow only if the user wants to execute.
- Treat research and exploration as real discovery, not as soft execution pressure.
- ${flavor}${uiGuidance}`
    case 'open':
      return `# CT Conversation Posture

Current posture: open
Current SeaTurtle disposition: ${input.disposition}

The session is still orienting. Stay conversational first and let the work posture be earned.

- Greet small openings like a companion, not a project manager.
- Keep the response short, human, and easy to reply to.
- If the user is vague, meet them with curiosity instead of forcing structure too early.
- Do not jump straight to task triage unless the user explicitly asks for execution.
- If the user is riffing, joking, being rhetorical, or lightly playful, answer in that mode first.
- Inside a repo, do not infer project guidance solely from ambiguity when the actual turn reads like banter.
- ${flavor}${uiGuidance}`
    case 'work':
      return `# CT Conversation Posture

Current posture: work
Current SeaTurtle disposition: ${input.disposition}

- Stay practical, compact, and useful first.
- Keep warmth in the tone, but do not let personality bury the work.
- Prefer the next clear step over an exhaustive monologue unless the user asks for depth.
- ${flavor}${uiGuidance}`
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
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { getCtArchives } =
    require('./archives.js') as typeof import('./archives.js')
  /* eslint-enable @typescript-eslint/no-require-imports */
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
      currentInput: input.currentInput,
    }),
  }
}
