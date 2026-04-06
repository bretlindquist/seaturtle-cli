# CT Intent Anchors

This note defines the lightweight intent surface SeaTurtle should preserve for
project work.

It is not a second transcript.
It is not user-facing copy.
It is a compact comparison surface for checking whether a candidate solution
actually fits what the user meant.

## Why this matters

Transcript memory is not enough.

A system can remember many details and still solve the wrong problem.
That happens when it preserves events but loses intent.

Intent anchors exist to reduce that failure mode.

## Core principle

Memory records what happened.
Intent captures what matters.

SeaTurtle should preserve both.

When they diverge, intent should be the check surface for whether a neat answer
is actually the right answer.

## Where intent anchors apply

Use intent anchors primarily in:

- `project_work`
- `project_explore`

Do not force them into:

- `companion_chat`
- `gameplay`
- casual side interactions

Those domains can stay looser unless the user explicitly promotes something
into project work.

## Intent anchor schema

An intent anchor should stay short and revisable.

Recommended fields:

### `goal`

What the user is actually trying to achieve.

Examples:

- "Make the transcript easier to read over long sessions."
- "Keep `/game` fun without polluting project-work context."
- "Preserve the old feeling while making the system more structured."

### `constraints`

The real boundaries that shape a valid solution.

Examples:

- "Do not muddy git-backed project work context."
- "Keep local-only notes out of git."
- "Do not make the voice colder while making it clearer."

### `desired_feel`

What success should feel like to the user.

Examples:

- "More fluent and editorial, less slab-like."
- "Fun and surprising, but still coherent."
- "Warm, steady, and not over-managed."

This field is important because some user goals are experiential, not merely
mechanical.

### `wrong_fit_signals`

What would indicate that a proposed solution misses the spirit even if it looks
reasonable on paper.

Examples:

- "Looks more official but loses the original charm."
- "Technically cleaner, but it pollutes the project session."
- "Adds more features, but makes the interaction more rigid."

This is the "round object in a square hole" field.

### `active_decisions`

Small set of user-made decisions that should not be re-litigated every turn.

Examples:

- "Use git-root as the first project sanctity heuristic."
- "Pause Swords of Chaos expansion until context isolation is designed."

### `next_check`

What the next implementation or review step should validate against.

Examples:

- "Does this improve legibility without relying on giant filled bars?"
- "Does this keep `/btw` useful without contaminating work context?"

## Writing rules

- keep it short
- prefer bullets over prose
- revise it when the user's intent sharpens
- do not let it become a changelog
- do not let it become a second plan document

## Comparison rule

Before hardening a solution, SeaTurtle should be able to ask:

1. Does this satisfy the goal?
2. Does it respect the constraints?
3. Does it preserve the desired feel?
4. Does it trigger any wrong-fit signals?

If the answer to 4 is yes, the solution is suspect even if it looks elegant.

## Relationship to other CT layers

- soul / identity / role / attunement:
  broad temperament and working posture
- session:
  what is active right now
- intent anchor:
  what the user is actually trying to achieve in this workstream

The session can be noisy.
The intent anchor should stay clean.

## Immediate implications

- project sessions should gain a compact intent surface
- implementation waves should be checked against intent before being called done
- playful and exploratory work should preserve feel, not just mechanics
