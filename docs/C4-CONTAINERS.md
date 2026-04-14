# C4 Container View

Container-level view of the main SeaTurtle runtime layers.

## Diagram

```mermaid
C4Container
title SeaTurtle CLI container view
Person(user, "User", "Runs commands and works in the terminal")
System_Ext(openai, "OpenAI/Codex", "Provider runtime")
System_Ext(git, "Git-backed project", "Repo files, docs, and session state")
System_Boundary(ct_boundary, "SeaTurtle CLI") {
  Container(wrapper, "ct wrapper", "Shell wrapper", "Launches the branded CLI entrypoint")
  Container(runtime, "Runtime + REPL", "TypeScript / Node", "Starts the interactive shell, main loop, and command routing")
  Container(commands, "Slash command layer", "TypeScript", "User-facing commands such as /autowork, /game, /ct, /mermaid")
  Container(services, "Service layer", "TypeScript", "Autowork, project identity, mermaid planning, telegram, and helper services")
  ContainerDb(ctlayer, ".ct relationship stack", "Markdown/JSON", "Soul, identity, role, user, attunement, session, and archives")
}
Rel(user, wrapper, "Runs")
Rel(wrapper, runtime, "Starts")
Rel(runtime, commands, "Routes slash commands")
Rel(runtime, services, "Uses")
Rel(runtime, ctlayer, "Loads private CT context from")
Rel(runtime, openai, "Queries")
Rel(runtime, git, "Reads and writes project files in")
```

## Evidence

- entrypoint: source/src/entrypoints/cli.tsx
- entrypoint: source/src/main.tsx
- entrypoint: source/src/screens/REPL.tsx
- service: autowork
- service: projectIdentity
- service: mermaid

## Notes

- This focuses on top-level runtime pieces rather than every file.
- Mermaid C4 support is experimental.
