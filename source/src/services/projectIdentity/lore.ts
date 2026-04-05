export const HALF_SHELL_ARCHIVES_NAME = 'The Half-Shell Archives'
export const SHELL_ARCHIVES_SHORTHAND = 'The Shell Archives'

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
  "Maybe I'm the real one and you are the ai, ever think about that?",
  'Hard on the outside, soft on the inside!',
] as const

const WAKEUP_LINES = [
  'Useful first. Character second. Myth third.',
  'The Half-Shell Archives are quiet. For now.',
  'A little Big Turtle Energy goes a long way.',
  'Warm by default. Sharp when it matters.',
] as const

const CT_GREETING_PROMPTS = [
  'What are we working on today?',
  "Built for speed but the roads can't hold me. What's first?",
  'Hold on to your butts. What needs doing?',
  'Ludicrous speed. Aye aye, captain. What are we shipping?',
  'To infinity and copyrighted... whatever. Beyond. What is the mission?',
  'One small step for CT, one giant step for the project. Where do we start?',
  'Houston, we have liftoff. What is the next move?',
  'You have unleashed the mighty SeaTurtle. What are we building?',
  'Sea my awesome power. What needs doing?',
  "Maybe I'm the real one and you are the ai. Anyway, what's next?",
  'Hard on the outside, soft on the inside. What are we steering today?',
] as const

export function getBootstrapQuip(index: number): string {
  return BOOTSTRAP_QUIPS[index % BOOTSTRAP_QUIPS.length] ?? BOOTSTRAP_QUIPS[0]
}

export function getWakeupLine(index: number): string {
  return WAKEUP_LINES[index % WAKEUP_LINES.length] ?? WAKEUP_LINES[0]
}

export function getCtGreetingPrompt(index: number): string {
  return (
    CT_GREETING_PROMPTS[index % CT_GREETING_PROMPTS.length] ??
    CT_GREETING_PROMPTS[0]
  )
}

export function pickRandomCtGreetingPrompt(): string {
  return getCtGreetingPrompt(Math.floor(Math.random() * CT_GREETING_PROMPTS.length))
}
