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

export function getBootstrapQuip(index: number): string {
  return BOOTSTRAP_QUIPS[index % BOOTSTRAP_QUIPS.length] ?? BOOTSTRAP_QUIPS[0]
}

export function getWakeupLine(index: number): string {
  return WAKEUP_LINES[index % WAKEUP_LINES.length] ?? WAKEUP_LINES[0]
}
