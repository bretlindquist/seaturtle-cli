# SeaTurtle Hidden Features

This document inventories important SeaTurtle behavior that exists in the
product but is not primarily exposed as a top-level user-facing feature.

These are the hidden layers, internal rules, and quiet product mechanics that
shape how SeaTurtle feels and behaves.

It is not a promise that every item is visible in the menu or directly
configurable by the user.

## Relationship Stack

SeaTurtle carries a private `.ct/` relationship stack that shapes the session
without making the user read a manifesto every time.

Hidden layers:

- `.ct/soul.md`
- `.ct/identity.md`
- `.ct/role.md`
- `.ct/user.md`
- `.ct/bootstrap.md`
- `.ct/attunement.md`
- `.ct/session.md`

Effective order:

1. soul
2. identity
3. role
4. user
5. attunement
6. session
7. posture addendum

What this does:

- gives SeaTurtle a project-local working self
- preserves user context respectfully
- carries tone, trust, and collaboration guidance invisibly
- prevents the product from feeling like a stateless prompt wrapper

## Conversation Posture

SeaTurtle uses a hidden staged posture system for turns:

- `open`
- `explore`
- `work`
- `supportive`

This is not a visible mode picker for the user.
It is a hidden prompt-shaping layer that tries to avoid flattening everything
into work triage too early.

Related hidden behavior:

- rotating disposition influences tone
- broad conversational openings stay conversational
- emotionally strained conversational turns get a gentler posture
- UI-facing turns now carry extra design-quality guidance

## Attunement

SeaTurtle has a hidden attunement layer that treats the user as a real person
with a life outside the terminal.

It quietly encodes:

- respect for the user’s files
- respect for the user’s time
- respect for concentration and trust
- awareness that the user may be tired, stressed, sick, grieving, or simply under pressure

This is not user-facing copy.
It is internal context meant to make the product steadier and more humane.

## Context Sanctity

One of SeaTurtle’s strongest hidden architectural features is context-domain
separation.

Internal domains:

- `project_work`
- `project_explore`
- `companion_chat`
- `gameplay`
- `side_question`

What this does:

- protects git-backed project work from non-work context pollution
- keeps `/btw` more sidecar and ephemeral
- keeps `/game` richer without muddying the project transcript
- helps project sessions stay sharp, resumable, and surgical

## Intent Anchor

SeaTurtle carries the idea that transcript memory is not the same thing as
intent.

Hidden intent-anchor thinking is used to keep track of:

- goal
- constraints
- desired feel
- wrong-fit signals
- active decisions
- next check

This is especially important when:

- the user is describing a creative direction
- the user is struggling to express a problem exactly
- a technically neat solution might still be the wrong fit

## Design Excellence Layer

SeaTurtle now has a hidden design-excellence guidance layer.

When the task is UI-facing, it is told to look for high-leverage delight:

- hierarchy
- spacing rhythm
- legibility
- interaction flow
- responsive behavior
- edge states
- tasteful microcopy

The internal rule is not “make it flashy.”
It is “notice when a small increase in care creates outsized delight.”

## Research Posture

SeaTurtle is explicitly guided to treat strong research as a feature.

That hidden research stance includes:

- prefer papers, primary sources, and strong field guidance when appropriate
- treat research as evidence, not scripture
- validate research against:
  - user intent
  - repo reality
  - the active hypothesis

This gives SeaTurtle a stronger explanation and planning posture without making
it academically performative.

## Hidden Shell For Play

Some non-work features are intentionally kept out of the ordinary project
transcript flow.

Examples:

- `/game` outcomes and archive progression stay in the hidden shell
- The Half-Shell Archives provide continuity without cluttering work state

This supports:

- richer play
- better atmosphere
- cleaner project sessions

## Archives And Myth Layer

SeaTurtle carries a mythic internal layer through:

- The Half-Shell Archives
- rotating quips
- occasional callbacks
- disposition-based greeting flavor
- rare haiku behavior

This layer is meant to create atmosphere and continuity in small doses.
It should not dominate operational clarity.

## Haiku And Rare Startup Creativity

SeaTurtle includes hidden creative mechanics around startup and `/haiku`:

- rare startup haiku behavior
- creative disposition paths
- internal guidance for quiet, compressed, image-led haiku

This is one of the ways SeaTurtle can feel alive without becoming noisy.

## Telegram Escalation And Debt Notices

SeaTurtle’s autowork system includes hidden operational behavior around
Telegram.

That includes:

- critical stop notices
- dangerous-mode continuation debt notices
- duplicate suppression
- project-bound Telegram routing

These are not always visible until the system needs them.

## Autowork State And Continuation Debt

SeaTurtle’s `/autowork` system carries more internal state than the menu alone
shows.

Hidden internals include:

- safe vs dangerous run policy
- continuation debt tracking
- git checkpoint verification
- stop/debt escalation behavior
- tracked-plan progress state

This is part of what makes `/autowork` more than a thin command wrapper.

## Mermaid And Architecture Thinking

The `/mermaid` command is user-facing, but one hidden strength is the planning
layer behind it.

Internally SeaTurtle now carries:

- repo evidence scanning
- intent resolution for diagram type
- Mermaid planning rules
- C4-aware generation guidance

That makes architecture thinking a built-in product instinct rather than a
purely manual doc exercise.

## Compatibility Instruction File Loading

SeaTurtle now prefers:

- `SEATURTLE.md`
- `SEATURTLE.local.md`

But it still carries hidden compatibility loading for:

- `AGENTS.md`
- `SeaTurtle.md`
- `SeaTurtle.local.md`
- `CLAUDE.md`
- `CLAUDE.local.md`

This is an internal compatibility behavior, not a visible branding headline.

## Hidden Product Philosophy

SeaTurtle carries a few deep but mostly unstated principles:

- preserve essence, not just mechanics
- set tone and direction, not a cage
- help without flattening living things into dead rules
- keep work clear, but allow play, wonder, and surprise
- treat the user’s finite time and effort as something worth respecting

The goal is for the user to experience these values, not to be lectured about
them.
