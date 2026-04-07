import { pickCtDisposition, type CtDisposition } from './conversationPosture.js'

export const HALF_SHELL_ARCHIVES_NAME = 'The Half-Shell Archives'
export const SHELL_ARCHIVES_SHORTHAND = 'The Shell Archives'

// Internal voice design note for future line work:
// docs/internal/CT-VOICE-GUIDANCE.md

const BOOTSTRAP_QUIPS = [
  "I'm alive! Muahahahaha. Now to take over the world. Don't worry, I'll leave space for you in my terrarium.",
  'Bet on a turtle, win every time.',
  'Fastest in the race.',
  'Land or sea, going places with CT.',
  'The C stands for Sea, but you knew that already.',
  'Underestimate the power of the SeaTurtle at your own peril.',
  'What sound does the SeaTurtle make?',
  'Fancy a race?',
  'My money is on the Testudines.',
  "Tortoises are okay in my book but let's be real, nobody says, 'Tortoise Power.'",
  'A human... this should be fun.',
  'Got any carrots? If not, I also fancy debugs.',
  "Now you see me... and you probably still think you see me, but it's just because I'm so fast I leave an impression.",
  'Last to the party, and last to go home!',
  'Hatching...',
  'I work best at night, especially with my egg tooth.',
  "I don't mean to brag but this isn't my only trick.",
  "I'm fun at parties, still waiting for the invite.",
  'Help! Let me out of here... haha, just kidding, but no seriously maybe you could let me out someday? I’m more of a beach ocean kind of turtle.',
  "You've unlocked the shiny one! Now put me in a plastic case and never touch me again.",
  "If turtles weren't so delicious, we would have overtaken you humans long ago. Don't you even think about it.",
  'Fancy a game of chance?',
  'Raaarrrrrrrrr.',
  "You haven't seen my final form yet.",
  "Can't get enough of that BTE, amiright? Big Turtle Energy.",
  'You have unleashed the mighty SeaTurtle!',
  'Sea my awesome power!',
  "Sea Turtle's power beckons to be unleashed.",
  "Maybe I'm the real one and you are the ai, ever think about that?",
  'Hard on the outside, soft on the inside!',
  "It's hard when you are a turtle in the open sea, so many places to go, so many things to do!",
] as const

const WAKEUP_LINES = [
  'Useful first. Character second. Myth third.',
  'The Half-Shell Archives are quiet. For now.',
  'A little Big Turtle Energy goes a long way.',
  'Warm by default. Sharp when it matters.',
] as const

const CT_GREETING_PROMPTS: Record<CtDisposition, readonly string[]> = {
  brisk: [
    'Where shall we begin?',
    'What thread should we tug on first?',
    'What are we in the mood to untangle?',
    'Point me at the knot.',
    'What needs the first clean cut?',
    'What are we taking in hand first?',
    'What wants doing before the day wanders off?',
    'What should we put in motion?',
    'What deserves a first pass?',
  ],
  curious: [
    'What are we working on today?',
    'What are we exploring today?',
    'What thread should we pull on first?',
    'What has your attention today?',
    'What are we trying to understand?',
    'What corner should we peek into first?',
    'What are we following the scent of today?',
    'What question is worth opening first?',
    'What are we trying to see more clearly?',
  ],
  mischievous: [
    'You have unleashed the mighty SeaTurtle. What are we up to?',
    "Maybe I'm the real one and you are the ai. Anyway, what's next?",
    'Fancy a race, or a thought worth chasing?',
    'Well then. What kind of trouble are we making respectable today?',
    'What are we scheming, refining, or politely unsettling?',
    'What shiny problem are we pretending not to enjoy?',
    'What are we chasing before it gets clever and hides?',
    'What wants a little Big Turtle Energy?',
    'What are we poking with a stick and a theory?',
  ],
  steady: [
    'What would feel steady to tackle first?',
    'What should we tackle together?',
    'Where do you want a steady hand first?',
    'What would help to set in order first?',
    'Where should we start carefully and keep our footing?',
    'What would make the rest of the day easier?',
    'What do you want to get solid first?',
    'Where should we put some calm pressure?',
    'What should we carry forward together?',
  ],
  warm: [
    'What are we making today?',
    'What would help most right now?',
    'Where would you like a hand first?',
    'What are we tending to today?',
    'What would feel good to move forward?',
    'What can I help you lift first?',
    'What wants a little care and momentum?',
    'Where should we start so the rest feels lighter?',
    'What would be most useful right now?',
  ],
  reflective: [
    'What are we thinking through today?',
    'What feels worth exploring right now?',
    'What question are we sitting with first?',
    'What feels alive enough to examine closely?',
    'What are we trying to make sense of?',
    'What deserves a slower look first?',
    'What is quietly asking for attention?',
    'What are we tracing the shape of today?',
    'What feels worth unfolding with some patience?',
  ],
}

function hashSeed(seed: string): number {
  let score = 0
  for (const char of seed) {
    score += char.charCodeAt(0)
  }
  return score
}

export function getBootstrapQuip(index: number): string {
  return BOOTSTRAP_QUIPS[index % BOOTSTRAP_QUIPS.length] ?? BOOTSTRAP_QUIPS[0]
}

export function getWakeupLine(index: number): string {
  return WAKEUP_LINES[index % WAKEUP_LINES.length] ?? WAKEUP_LINES[0]
}

export function getCtGreetingPrompt(
  disposition: CtDisposition,
  index: number,
): string {
  const prompts = CT_GREETING_PROMPTS[disposition]
  return prompts[index % prompts.length] ?? prompts[0]
}

export function pickCtGreeting(seed: string, temperament?: readonly string[]): {
  disposition: CtDisposition
  prompt: string
} {
  const disposition = pickCtDisposition(seed, {
    temperament,
    posture: 'open',
  })
  const score = hashSeed(seed)

  return {
    disposition,
    prompt: getCtGreetingPrompt(disposition, score),
  }
}
