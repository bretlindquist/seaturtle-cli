# Mermaid and C4 Quality Guide

This guide exists to keep built-in Mermaid output clear, evidence-based, and worth looking at.

The goal is not merely to emit valid Mermaid.
The goal is to produce diagrams that help a human understand the system quickly.

## What went wrong with the current C4 container diagram

The current output is structurally valid Mermaid C4, but weak architecture communication.

### Evidence from the generator

The current container view is almost entirely hard-coded in `source/src/services/mermaid/planner.ts:209`.

Notable issues:

- `buildC4ContainerMermaid()` takes no repo evidence input at all, so the diagram cannot adapt to the actual project structure.
- Container names are generic and conceptual: `Runtime + REPL`, `Slash command layer`, `Service layer`.
- The function mixes architectural levels by showing user-facing concepts, implementation slices, and private state in one view.
- The entrypoint wrapper is given equal visual weight with core runtime internals.
- The diagram models the `.ct` layer as a major database-like container even though the runtime/service split is the real architectural center of gravity.

The current repo scan is also intentionally narrow in `source/src/services/mermaid/scan.ts:6` and `source/src/services/mermaid/scan.ts:15`.

Notable issues:

- `TOP_COMMAND_NAMES` is a short fixed list.
- `TOP_SERVICE_NAMES` is a short fixed list.
- only a few entrypoints are captured.
- import-edge collection is local and shallow.
- there is no ranking step to decide which relationships are most important.

So the planner is not really discovering architecture yet.
It is mostly filling a template with a little evidence around the edges.

### Evidence from the generated doc

`docs/C4-CONTAINERS.md:12` through `docs/C4-CONTAINERS.md:25` shows the exact result.

Problems visible in the output:

- the system boundary exists, but the relationships do not make the internal hierarchy obvious.
- labels describe broad ideas rather than concrete runtime responsibilities.
- the diagram asks the viewer to read every sentence instead of letting structure speak first.
- the relationship set is too literary for a container diagram and not selective enough.
- external systems and local project state are modeled as peers without enough semantic distinction.

### The root cause

We installed Mermaid C4 syntax, but we did not yet give the generator a strong architecture opinion.

The missing piece is not more syntax.
The missing piece is a better model for:

- what deserves to appear at each C4 level
- how to select only the most important relationships
- how to name containers in a way that is concrete and architectural
- how to keep conceptual lore from leaking into a structural view

## Quality bar for built-in Mermaid diagrams

A built-in Mermaid diagram should pass all of these tests.

### 1. One diagram, one job

A diagram must answer one clear question.

Examples:

- context: what systems and actors interact with SeaTurtle?
- container: what are the main executable/runtime parts inside SeaTurtle?
- component: how does one selected feature slice fit together?
- dynamic: what happens, step by step, during one concrete interaction?
- journey: what does the user experience over time?

Do not mix these jobs.

### 2. Evidence before prose

Every node and edge should come from one of these sources:

- observed entrypoints
- observed directories or files with real architectural responsibility
- observed imports or calls
- clearly marked inference when structure must be summarized

If a relationship is inferred for readability, say so in notes.

### 3. Prefer architecture nouns over vague layer words

Bad:

- Runtime + REPL
- Service layer
- Slash command layer

Better:

- CLI runtime
- Command router
- Mermaid generation service
- Project identity service
- Telegram integration

Names should tell the viewer what the thing is, not just where it sits in a stack.

### 4. Show fewer things, more clearly

A good diagram is selective.

For built-in generation:

- context: 3 to 6 nodes is usually enough
- container: 4 to 7 nodes is usually enough
- component: 4 to 8 nodes is usually enough
- dynamic: 5 to 9 interactions is usually enough

If the diagram needs more, split it.

### 5. Relationships must earn their place

Every edge should answer one of these:

- who starts what?
- who calls what?
- who reads from what?
- who writes to what?
- who depends on what external system?

Avoid decorative verbs like `uses` when a sharper verb exists.

Prefer:

- starts
- routes
- loads
- reads
- writes
- sends
- queries
- resolves

### 6. Visual gravity should match system importance

The most important runtime container should occupy the center.
Supporting adapters and side stores should not dominate the view.

For SeaTurtle, the likely center of gravity is the CLI runtime and command execution path, not the wrapper script and not the private `.ct` store.

### 7. Keep private voice/context layers in the right kind of diagram

`.ct` and related private CT state are real and interesting, but they should only appear when they are truly relevant to the question the diagram answers.

They fit better in:

- a focused CT identity diagram
- a project-local context map
- a dynamic diagram showing startup/context loading

They do not automatically belong in the default container view.

### 8. C4 should feel architectural, not theatrical

Container diagrams should not read like lore cards.
They should feel like a clean map of executable or data-bearing parts.

## Quality bar for ordinary Mermaid diagrams

Built-in non-C4 Mermaid diagrams should also follow stricter rules.

### Flowcharts

Use flowcharts for:

- startup paths
- command routing
- decision branches
- file and service movement when ordering matters loosely

Rules:

- keep the main path visually straight when possible
- use subgraphs only when they clarify ownership
- prefer short labels with richer markdown notes below the diagram
- avoid fan-out explosions from one giant root node

### Sequence diagrams

Use sequence diagrams for:

- one command execution path
- one request/response cycle
- one interaction with a provider or external service

Rules:

- name participants consistently
- each step should be a real event, not a summary blob
- do not include optional branches unless they matter to the story

### Journey diagrams

Use journey diagrams for:

- operator flow
- setup/onboarding
- user experience across a feature

Rules:

- focus on user-visible phases
- keep system internals mostly out of the journey itself
- use satisfaction scores with restraint

## SeaTurtle-specific generation rules

These rules are specific to this repo.

### Default C4 context view

Should usually include:

- User
- SeaTurtle CLI
- provider runtime when enabled or relevant
- project workspace / repository
- Telegram only when the chosen slice genuinely uses it

Should not automatically include every side feature.

### Default C4 container view

Should usually include only the major executable/data containers, for example:

- CLI entrypoint or launcher adapter
- CLI runtime
- command router or command modules
- feature services
- project workspace
- provider runtime

Only include private CT state if the diagram is explicitly about CT context loading.

### Default component view

A component view must be target-led.
It should focus on one selected service or feature and derive nodes from actual source files and imports.

### Default dynamic view

A dynamic view must trace a real path.
`/mermaid`, `/telegram`, `/autowork`, and startup are good candidates because they have concrete flows.

## Recommended generator improvements

These are the highest-leverage improvements to the implementation.

### 1. Make the planner rank architectural evidence

Add a ranking step before rendering.
The planner should decide:

- what is central
- what is peripheral
- what belongs at this abstraction level
- what should be omitted

### 2. Replace fixed top-level shortlists with discovered structure

The current fixed lists in `source/src/services/mermaid/scan.ts:6` and `source/src/services/mermaid/scan.ts:15` are useful for demos, but not enough for strong diagrams.

Prefer discovery from:

- commands present in `source/src/commands`
- services present in `source/src/services`
- selected focus path imports
- known architectural anchors like entrypoints and REPL/runtime files

### 3. Add diagram-specific naming rules

Before rendering, pass node names through a naming pass that:

- strips filler words
- prefers architectural responsibility
- keeps labels short
- moves longer explanation into the description text

### 4. Add a quality checklist to generation

Before writing markdown, validate:

- does this diagram answer one question?
- are there too many nodes?
- are edge verbs sharp?
- are any labels vague?
- is anything included only because it is interesting rather than necessary?

If the answer is bad, simplify before writing.

### 5. Make notes honest about inference

When the generator summarizes architecture from partial evidence, the notes should say so plainly.
That builds trust.

## Acceptance checklist for future Mermaid output

A built-in diagram is ready when:

- a human can understand the main shape in a few seconds
- the center of gravity is obvious
- labels are concrete
- edges are selective and meaningful
- the diagram stays within one abstraction level
- notes distinguish evidence from inference
- the result feels like a tool for thinking, not a placeholder example

## Short version

What went wrong was not the C4 install.
What went wrong was that the current planner emits a generic template with thin evidence, so the result looks like a demo diagram instead of an architecture diagram.

To make Mermaid and Mermaid C4 look fantastic, we need stronger evidence selection, sharper naming, stricter scope per diagram type, and a small built-in quality bar before writing docs.
