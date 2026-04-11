# Agency

`/agency` manages the optional third-party `msitarzewski/agency-agents` markdown agent pack and installs those agents as native SeaTurtle custom agents.

## What It Does

- installs selected Agency agents into the normal SeaTurtle agents directory
- tracks ownership in a SeaTurtle-managed manifest so updates and removals stay deterministic
- keeps Agency execution on the normal subagent runtime, so specialist work runs in a clean separate agent session

`/agency` is a pack manager, not a second agent runtime.

## Scopes

User scope:

- installs agent markdown into the user config agents directory
- keeps the Agency manifest in the user config home
- makes the installed agents available across projects

Project scope:

- installs agent markdown into this project's `.claude/agents`
- keeps the project Agency manifest private in the user config home, keyed by the canonical project root
- avoids committing Agency state into the repo while still making the agents project-local

## Commands

Browse and inspect upstream before install:

- `/agency browse [query]`
- `/agency browse [query] --refresh`
- `/agency refresh`

Manage installed Agency agents:

- `/agency install <all|division|agent>`
- `/agency install <all|division|agent> --project`
- `/agency update`
- `/agency update --project`
- `/agency remove <all|division|agent>`
- `/agency remove <all|division|agent> --project`
- `/agency list`
- `/agency list --project`
- `/agency status`
- `/agency status --project`

Run an installed Agency agent:

- `/agency run <agent> <task>`
- `/agency run <agent> <task> --project`

## Typical Flows

Install a marketing specialist for general use:

```text
/agency browse marketing
/agency install marketing
/agency run social-media-strategist Draft a launch-channel plan for our next release.
```

Install Agency agents only for the current project:

```text
/agency install marketing --project
/agency list --project
/agency run social-media-strategist Draft a launch-channel plan for this repo. --project
```

Refresh from upstream:

```text
/agency status
/agency update
```

## Selection And Ownership Rules

- Agency-managed files are namespaced as `agency-<division>-<agent>.md`
- only manifest-owned files are updated or removed
- unmanaged local agent files are never overwritten
- if a managed Agency file was edited locally and its content drifted, `update` and `remove` will skip it and report the drift instead of silently clobbering it

## Catalog Cache

Agency upstream browse data is cached locally.

- `browse` uses the cache when it is fresh
- `install` and `update` force a fresh upstream fetch
- `status` shows cache freshness, age, commit, and cache path
- `refresh` explicitly rewrites the catalog cache

The cache is versioned so stale schema shapes are not silently reused after future format changes.

## Runtime Behavior

Installed Agency agents are normal SeaTurtle custom agents after import.

- they appear through the normal agent discovery flow
- they run through the normal agent/subagent runtime
- specialist work happens in a clean separate agent session
- the main thread only receives the result handoff unless the runtime needs more coordination

This is the intended model for bounded expert tasks with lower context overhead and cleaner separation from the main session.
