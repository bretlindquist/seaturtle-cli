# Swords Of Chaos Polish And Balance Plan

This is the next-phase plan for making `Swords of Chaos` feel like an actually
fun DM-driven character-lore game, now that the core runtime seams exist.

The goal is not to add heavy RPG machinery. The goal is to sharpen dramatic
variety, stakes, recurrence, and payoff using the existing runtime truth:

- durable save and event state own canon
- planners interpret canon into DM-facing choices, pacing, pressure, and payoff
- the host presents pacing and UI without owning story truth

## Product Target

The game should feel:

- authored from the current moment
- procedural without sounding generic
- mythic without becoming constant noise
- character-driven without turning into a stat sheet
- continuous enough that prior choices matter emotionally, not only technically

## Balance Principles

- Mystery should exceed explanation, but stakes should usually be legible.
- Magic should be rare enough to matter and disruptive enough to change play.
- The same locus should not imply the same scene shape.
- Most choices should imply a cost, not just a style.
- Character development should create temptations and vulnerabilities, not only
  titles.
- Repetition is acceptable only when the world is clearly remembering and
  changing the meaning of the repeated thing.

## Target Rhythm

Use a rough dramatic mix rather than hard quotas:

- 60 percent grounded pressure: pursuit, negotiation, hazard, debt, observation
- 30 percent overt uncanny: omens, wrong names, witness pressure, thresholds
- 10 percent myth-breaking: crossings, relic proof, forbidden returns, rule
  changes

If every scene is myth-breaking, none of them are.

## Chunks

### 1. Scene Families And Stakes

Status: implemented

Problem:
- loci are doing too much work
- choices can still feel like elegant pressure styles rather than concrete
  dramatic situations

Target:
- derive a lightweight scene family from current story, continuation, scene,
  character, and magic pressure
- add an explicit stakes line before the choice surface
- use the scene family to vary labels and descriptions

Scene families:
- intrusion
- negotiation
- pursuit
- omen
- test
- revelation
- debt collection
- false refuge

Success:
- the same station, alley, grove, or dungeon can produce different play shapes
  across visits
- the player understands what is at risk before choosing

### 2. Expanded Move Grammar

Status: implemented

Problem:
- the visible menu still maps mostly to force, restraint, and assertion

Target:
- add a richer planner vocabulary while preserving safe internal route mapping
- support moves such as threaten, observe, invoke, deceive, bargain, endure,
  follow, and profane

Success:
- visible choices feel behaviorally different, not just tonally different

Current implementation:
- the planner maps visible choices onto move grammar such as threaten,
  observe, invoke, deceive, bargain, endure, follow, and profane
- internal route keys stay stable while player-facing action descriptions now
  imply different risks and costs

### 3. Recurring Presences

Status: implemented

Problem:
- lore is present, but relationship pressure is still thin

Target:
- introduce a few durable presences that can recur across loci:
  watcher, debtor, false guide, threshold herald, wrong-name voice

Success:
- the player can recognize entities and pressures across scenes without needing
  an explicit cast screen

Current implementation:
- recurring presences are planner-derived from existing story, continuation,
  scene, character, and magic state
- active presences include the Watcher, Debtor, False Guide, Threshold Herald,
  and Wrong-Name Voice
- presences add scene lines, pressure lines, and option rewrites without adding
  new save schema

### 4. Chapter Confrontations

Status: implemented

Problem:
- chapter progression exists, but chapters need stronger dramatic crowns

Target:
- every few chapters, escalate into a confrontation that pays off the current
  thread and character pressure

Confrontation examples:
- the thing naming you
- the watcher who followed too long
- the door that opens only to liars
- the relic that wants use, not custody

Success:
- the journey has peaks, not only accumulating atmosphere

Current implementation:
- confrontation peaks are planner-derived from existing chapter, tension,
  presence, continuation, scene, and magic state
- active confrontation modes include the watcher reckoning, wrong-name source,
  liar door, relic custodian, and debt come due
- confrontation lines, pressure, hints, and option rewrites now create harder
  chapter peaks without new save schema

### 5. Rule-Changing Magic

Status: implemented

Problem:
- magical pressure is tracked but still often behaves like enhanced flavor

Target:
- allow rare magical events to alter action availability, retreat, outcome
  framing, route access, and lasting marks

Success:
- magical events feel dangerous and game-shaping, not decorative

Current implementation:
- active uncanny states now add explicit rule-change lines and hint text
- magic can rewrite visible choices when crossing, witness, relic-sign, or omen
  pressure is active
- current magic effects can alter how retreat, observation, proof, and symbolic
  action are framed without changing the underlying safe route spine

### 6. Character Arc Temptations And Costs

Status: implemented

Problem:
- character development currently recognizes who the player is becoming, but
  needs sharper tradeoffs

Target:
- each arc should offer a tempting route and a cost:
  edge acts faster but worsens fallout; witness sees more but attracts more;
  myth gains proof while losing stable explanation

Success:
- character development changes play incentives and consequences

Current implementation:
- each active arc now exposes an explicit cost line alongside temptation and
  pressure
- opening and second-beat options are rewritten so favored arc-aligned moves
  now telegraph their tradeoff, not just their tone
- free-response dramatic beats and chapter payoff text now carry the cost side
  of the arc forward so the player sees what their growth is starting to cost

### 7. Consequence Visibility Pass

Status: implemented

Problem:
- continuity exists, but emotional consequence can still be under-felt

Target:
- after meaningful choices, clarify:
  what changed in the world
  what changed in the character
  what is now coming next

Success:
- players can explain why a prior choice matters without reading save state

Current implementation:
- chapter payoff text now explicitly answers what changed in the world, what
  changed in the character, and what pressure comes next
- residual variation lines still carry thread- and continuity-specific fallout
- the live journey panel now surfaces upcoming pressure more directly instead of
  only showing aftermath and chapter identity

### 8. Content Polish Pass

Problem:
- procedural text can still overuse the same ominous sentence shapes

Target:
- vary prose cadence, tighten labels, reduce repeated pressure vocabulary, and
  ensure every outcome has one memorable image

Success:
- the game feels written and curated, not assembled from competent fragments

## Implementation Rule

Prefer planner-level interpretation before adding durable state. Add new save
state only when a concept must persist independently across sessions.
