# Example Executable Autowork Plan

Status: tracked fixture for parser smoke cases

## Chunk AW1
Status: pending
Purpose: Add eligibility gate for autowork
Files: source/src/services/autowork/eligibility.ts, source/src/commands/autowork/autowork.tsx
Dependencies: state model agreed
Risks: false positives on dirty-tree detection
Validation: npm run dev-check
Done: autowork refuses to start when repo is dirty

## Chunk AW2
Status: blocked
Purpose: Add rollout messaging
Files/areas: source/src/commands/autowork/autowork.tsx
Dependencies: AW1
Risks: unclear refusal copy
Validation: command smoke in REPL
Done: autowork explains its safe-mode guarantees before execution
