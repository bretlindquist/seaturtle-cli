export const DESCRIPTION =
  'Read and update the active workstream workflow packets as structured state'

export const PROMPT = `Use this tool to update the active workstream's authoritative workflow state.

## When to Use This Tool

- When autowork is in discovery, research, plan-hardening, implementation tracking, verification, or review
- When you need to record durable state into the active workstream packet files
- When you need to advance the workflow phase or update packet fields without hand-editing JSON

## Source of Truth

This tool writes to the authoritative \`.ct/state\` workflow packets. Prefer this tool over directly editing the workflow JSON files by hand.

## Update Rules

- Only update fields you actually know from evidence in the repo or conversation
- Replace list fields intentionally; do not append speculative filler
- Keep phase, packet content, and actual progress aligned
- Do not claim implementation, verification, or review progress that has not happened
- When hardening a plan file, keep the workflow plan packet aligned with the executable plan structure

## Notes

- You can update one or more packet groups in a single call
- Use \`phase\` to advance the active workflow phase explicitly
- Use \`plan.syncPlanFromFilePath\` when the tracked executable plan file was updated and the workflow plan packet should ingest the current chunk graph from that file
`
