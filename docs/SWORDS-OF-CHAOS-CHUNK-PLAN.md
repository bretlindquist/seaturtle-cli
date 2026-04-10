# Swords Of Chaos Chunk Plan

This is the current surgical plan for taking `Swords of Chaos` from a
deterministic hybrid runtime with improved continuity into a more fully
DM-driven procedural story engine.

The goal is not to turn the game into a bloated RPG system. The goal is to
make the DM surface feel authored from live state while preserving deterministic
runtime truth underneath.

## Current Source Of Truth

- host surface: `source/src/commands/game/game.tsx`
- game truth: `source/src/services/swordsOfChaos/`
- durable truth lives in save state and event application
- planner layers interpret that truth for the DM-facing surface

Current first-class state already includes:

- encounter continuity
- thread continuity
- story chapter, objective, tension, carry-forward
- continuation state
- unfolding scene state
- character development state
- magical pressure state
- SeaTurtle rarity/favor state

## Chunk Status

Implemented:

1. continuation progression
2. character development payoff
3. DM-owned choice surface
4. multi-scene scene state
5. outcome variation depth
6. magical event system
7. character progression UX

Remaining:

8. documentation refresh

## Remaining Product Gaps

The remaining work is now mostly about repo-facing explanation and final
handoff clarity rather than missing core Swords runtime seams.

### 1. Continuation Progression

Status: implemented

Problem:
- continuation currently affects pressure text and suspense beats
- it does not yet own an unfolding scene lifecycle

Target:
- a durable `sceneState` or equivalent unfolding situation layer
- later scenes know what commitment, hazard, and pending reveal are still live

Success:
- a prior action can remain meaningfully in progress across multiple beats or
  entries

### 2. Character Development Payoff

Status: implemented

Problem:
- character development exists, but the world does not react strongly enough to
  it

Target:
- scenes, temptations, recognitions, and payoffs should respond to who the
  player is becoming

Success:
- the same place feels different for an `edge` character than for a `witness`
  or `threshold` character

### 3. DM-Owned Choice Surface

Status: implemented

Problem:
- visible choices are improved, but still mostly ride on fixed route families

Target:
- planner-generated scene-native action sets
- runtime still validates and resolves beneath that surface

Success:
- choices feel authored from the moment, not selected from a disguised menu

### 4. Multi-Scene Scene State

Status: implemented

Problem:
- current flow is still mostly opening -> second beat -> payoff

Target:
- a lightweight scene lifecycle that can linger, complicate, reveal, and pay
  off over multiple beats

Success:
- committed intent can unfold through several beats before the next real choice

### 5. Outcome Variation Depth

Status: implemented

Problem:
- outcome backbone is still too route-keyed

Target:
- outcomes vary by locus, thread, continuation, tension, and character arc

Success:
- the same nominal route can land differently based on history

### 6. Magical Event System

Status: implemented

Problem:
- magic is currently thematic and ad hoc rather than systematized

Target:
- rare magical/event escalation with eligibility, recurrence, and consequence

Success:
- uncanny moments feel earned, trackable, and compounding

### 7. Character Progression UX

Status: implemented

Problem:
- the runtime knows more about the character than the player can clearly see

Target:
- a light in-world UI surface for current character arc, lesson, and pressure

Success:
- the player can tell what the journey is shaping them into

### 8. Documentation

Status: in progress

Problem:
- architecture and journey docs now trail the implementation

Target:
- repo docs should reflect the actual planner seams and runtime ownership

Success:
- another engineer can extend Swords without reverse-engineering it

## Completed Execution Order

1. continuation progression
2. character development payoff
3. DM-owned choice surface
4. multi-scene scene state
5. outcome variation depth
6. magical event system
7. character progression UX
8. documentation refresh

## Architectural Rules

- runtime owns durable truth
- planner owns interpretation and DM-facing shaping
- host screen owns pacing presentation, not story canon
- SeaTurtle remains rare and in-world
- elegance beats hardening when the choice is between simple expressive state
  and brittle over-modeling

## Next Phase

The core runtime plan above is implemented. The next phase is polish and
balance: making the existing systems feel fun, varied, and emotionally
consequential instead of adding heavier mechanics.

See `docs/SWORDS-OF-CHAOS-POLISH-BALANCE-PLAN.md`.
