# SeaTurtle Architecture

This doc is the durable architecture map for the current SeaTurtle stack.

It is meant to show the major runtime layers and the newer CT architectural
additions without forcing a reader to reconstruct them from state notes or
source spelunking.

## Runtime And Context Architecture

```mermaid
flowchart TD
    A["User runs ct"] --> B["bin/ct wrapper"]
    B --> C["node dist/cli.js"]
    C --> D["source/src/entrypoints/cli.tsx"]
    D --> E["source/src/main.tsx"]
    E --> F["REPL startup"]

    F --> G["Load project instructions"]
    G --> G1["SEATURTLE.md"]
    G --> G2["AGENTS.md compatibility"]
    G --> G3["Claude-era compatibility files if present"]

    F --> H["Bootstrap and load private .ct layer"]
    H --> H1["soul.md"]
    H --> H2["identity.md"]
    H --> H3["role.md"]
    H --> H4["user.md"]
    H --> H5["attunement.md"]
    H --> H6["session.md"]

    G --> I["Build effective hidden prompt context"]
    H --> I

    I --> J["Classify current turn"]
    J --> J1["Conversation posture: open / explore / work / supportive"]
    J --> J2["Context domain: project_work / project_explore / companion_chat / gameplay / side_question"]
    J --> J3["Intent anchor applies in project_work and project_explore"]

    J --> K{"Inside git-backed project?"}
    K -- Yes --> L["Protect project sanctity by default"]
    K -- No --> M["Allow looser general CT flow"]

    L --> N{"Turn type"}
    M --> N

    N -- "Explicit build / fix / validate" --> O["project_work"]
    N -- "Planning / research / architecture" --> P["project_explore"]
    N -- "Casual chat / philosophy / banter" --> Q["companion_chat"]
    N -- "/game" --> R["gameplay"]
    N -- "/btw" --> S["side_question"]

    O --> T["Sharp, resumable work memory"]
    P --> U["Broader project exploration memory"]
    Q --> V["Relational chat without polluting work context"]
    R --> W["Separate game state, archive, rarity, items, and outcomes"]
    S --> X["Ephemeral sidecar context with narrow borrowing"]

    T --> Y["Provider runtime, tools, slash commands, validation, git hygiene"]
    U --> Y

    V -. tiny ambient callbacks only .-> Z["No default spillover into project_work"]
    W -. hidden shell separation .-> Z
    S -. no transcript persistence .-> Z
```

## Current Architecture Truths

- `SEATURTLE.md` is the preferred shared project instruction file.
- `AGENTS.md` is read as a compatibility project-instructions file.
- The private `.ct/` stack is layered:
  1. soul
  2. identity
  3. role
  4. user
  5. attunement
  6. session
- Turn-level posture is applied lightly after those deeper layers.
- Git-root is the first heuristic for protecting project sanctity.
- `/btw` and `/game` are intentionally richer because they are separated from
  project-working memory instead of blended into it.
- Intent is treated separately from transcript memory so SeaTurtle can check
  whether a solution fits what the user actually meant.

## Related Docs

- [`README.md`](../README.md)
- [`docs/FEATURES-ROUTER.md`](./FEATURES-ROUTER.md)
- [`docs/BRANDING.md`](./BRANDING.md)
- [`docs/internal/CT-CONTEXT-DOMAINS.md`](./internal/CT-CONTEXT-DOMAINS.md)
- [`docs/internal/CT-INTENT-ANCHORS.md`](./internal/CT-INTENT-ANCHORS.md)
