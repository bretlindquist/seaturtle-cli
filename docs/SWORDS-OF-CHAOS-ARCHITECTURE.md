# Swords Of Chaos Architecture

This is the durable architecture map for the current embedded `Swords of Chaos`
runtime inside SeaTurtle.

It reflects the actual code path in this repo:

- host surface: `/game`
- embedded runtime: `source/src/services/swordsOfChaos/`
- save truth: local user-owned game state
- SeaTurtle: rare in-world presence, not the narrator

## Embedded Runtime Map

```mermaid
flowchart TD
    A["User runs /game"] --> B["source/src/commands/game/game.tsx"]
    B --> C["Hidden shell / menu flow"]
    C --> D["ensureSwordsOfChaosRuntimeReady()"]
    D --> E["saveManager.ts"]
    E --> F["~/.ct/games/swords-of-chaos/ save area"]

    D --> G["runtimeFacade.ts"]
    G --> H["eventHistory.ts"]
    G --> I["archiveEchoBridge.ts"]

    B --> J["getSwordsOfChaosRelevantMemory()"]
    J --> K["memoryModel.ts"]
    K --> L["encounterMemory"]
    K --> M["threadMemory"]
    K --> N["SeaTurtle state"]
    K --> O["worldMap.ts"]

    B --> P["renderSwordsOfChaosHybridScene()"]
    P --> Q["hybridDm.ts"]
    Q --> R["shells.ts"]
    R --> S["swordsOfChaosShells.ts"]
    Q --> O

    B --> T["resolveSwordsOfChaosRoute()"]
    T --> U["resolution.ts"]
    U --> V["outcomes.ts"]
    V --> W["swordsOfChaosOutcomes.ts"]
    U --> X["event batch"]

    X --> Y["eventValidators.ts"]
    Y --> Z["eventProcessor.ts"]
    Z --> AA["eventApplier.ts"]
    AA --> F
    Z --> H

    U --> AB["host echoes"]
    AB --> I
    I --> AC["Half-Shell Archives / CT project memory echoes"]

    K --> AD["Encounter family shift"]
    AD --> AE["alley"]
    AD --> AF["old-tree"]
    AD --> AG["ocean-ship"]
    AD --> AH["post-apocalyptic-ruin"]
    AD --> AI["space-station"]
    AD --> AJ["mars-outpost"]
    AD --> AK["fae-realm"]
    AD --> AL["dark-dungeon"]

    N --> AM["rare SeaTurtle glimpse"]
    AM --> AN["quiet-line favor path"]
```

## Current Architecture Truths

- `game.tsx` is the host surface, not the game engine.
- `swordsOfChaos/` owns the game truth.
- local save state and event history are the canonical memory layer.
- only selected high-salience outcomes echo back into SeaTurtle archives.
- encounter progression is driven by:
  - canonized threads
  - encounter memory
  - rare SeaTurtle state
- the hybrid DM seam is bounded and deterministic right now:
  - runtime-owned shells
  - runtime-owned outcomes
  - runtime-owned event application

## Why This Matters

This structure keeps `Swords of Chaos` rich without muddying project-working
context, and it leaves a clean extraction path if the game ever becomes a
standalone runtime later.
