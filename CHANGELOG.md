# SeaTurtle Changelog

## 1.11 - 2026-04-27

- Hardened the Gemini runtime with provider-specific replay sanitization, including assistant-first bootstrap repair, consecutive-assistant replay normalization, and conservative tool-result replay cleanup before Gemini request conversion.
- Made fresh visible Gemini user turns act like hard objective boundaries across REPL and headless flows, so stale hidden continuation prompts and old interruption markers stop biasing the next task.
- Added provider-aware interrupted-turn recovery for Gemini, preserved hidden resume guidance during restart auto-resume, and expanded the Gemini self-test surface around replay, turn boundaries, and recovery behavior.
- Added Gemini-only strict-mode guardrails for unattended work, including `/gemini strict`, broad destructive shell-command blocking, a Gemini reviewer barrier for mutation turns, and one bounded automatic repair pass before fail-closed stop.
- Hardened Gemini swarm reliability by removing a parallel worktree upstream-config race during agent spawn and by retrying transient empty Gemini responses before surfacing provider-aware block/finish diagnostics.
- Added stricter Gemini swarm integration guardrails so dirty parent repos block merge/cherry-pick style worktree integration, completed worktree agents tell the parent to stop instead of forcing a dirty merge, and narrow FileEdit operations can retarget after harmless full-read drift from formatters or sibling agents.

## 1.10 - 2026-04-22

- Added OpenAI hosted code interpreter as a first-class SeaTurtle tool with routed capability gating, status/auth exposure, self-tests, and live validation.
- Fixed the OpenAI hosted shell helper to use the streaming transport the current backend requires, so provider-hosted shell execution works again in the built CLI.
- Hardened OpenAI model and operator truth across `/status`, auth JSON, and the picker so hosted-tool availability is described per model instead of flattened or implied.
- Added an auth-aware OpenAI model-discovery audit path for maintainers so curated picker models can be checked against the official upstream `/v1/models` catalog without pretending ChatGPT OAuth can refresh that endpoint.

## 1.09 - 2026-04-21

- Added a production release installer path that installs SeaTurtle from published release artifacts instead of forcing a source build for normal users.
- Added standalone Bun release-artifact packaging and wired bundled release installs to update through `ct update`.
- Added a release-asset publish path and clean Linux Docker validation for the published artifact install path.
- Split the docs and source installer copy so contributor source builds stay available without being confused for the product install path.
- Fixed the local installer so it works under Bash and Git Bash instead of relying on a zsh-only PATH expansion.
- Improved local install UX with clearer SeaTurtle CT build copy and visible build-phase progress during source installs.
- Hardened the overlay dependency install path so npm output is surfaced, idle stalls fail with recovery steps, and cold-build retries no longer corrupt the workspace by overlapping overlay reinstalls.
- Fixed package-subpath shim generation for real directory subpaths such as `@google/genai/node`, which was breaking cold Docker installs during build retries.
- Updated install docs and success copy so the public source-build path is explicit and provider setup points at Anthropic, Gemini, and OpenAI/Codex correctly.
- Made `source/package.json` the single shipped version source of truth and removed the redundant root package version field.

## 1.08 - 2026-04-21

- Shipped the native Gemini production wave across the provider seam, including native `generateContent` / `streamGenerateContent`, tool replay with thought signatures, image generation/editing, Google Search, URL context, hosted code execution, file search, and guarded computer use.
- Added Gemini request guards, status/auth capability truth, and live/offline validation commands so operator-facing Gemini setup is explicit and repeatable.
- Updated the repo docs and short-form SeaTurtle routing docs so Gemini setup and Gemini-specific questions resolve to the right commands and references quickly.

## 1.06 - 2026-04-14

- Fixed duplicate submitted image rows so inline `[Image #N]` references no longer render a second attachment line underneath.
- Tightened the shipped CT command surface and updater-facing branding around the SeaTurtle runtime.
- Continued hardening the OpenAI/Codex runtime and validation path so update checks and regression signals stay consistent.

## 1.05 - 2026-04-14

- Expanded the OpenAI/Codex runtime to support web search, hosted file search, hosted shell, image generation, computer use, and safer MCP capability routing.
- Fixed OpenAI helper request-shape and transport issues, including web-search streaming and multimodal image/PDF input handling.
- Improved CT interaction reliability with stronger transcript/paste validation, queue editing cleanup, and clearer runtime/status surfaces.

## 1.04 - 2026-04-12

- Fixed OpenAI/Codex web-search request-shape errors in the native runtime.
- Improved `ctrl+o` transcript search reliability after closing the search bar.
- Removed noisy startup snapshot errors and tightened replay/update stability.
