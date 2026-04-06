# Free SeaTurtle

This document describes a practical path for turning the current SeaTurtle codebase into a codebase that is much safer to ship as an independent product with its own implementation, provenance, and identity.

It is not legal advice. It is an engineering and product plan for reducing copyright and lineage risk.

## Goal

The goal is not to cosmetically rename inherited code.

The goal is to make SeaTurtle:

- independently implemented
- independently structured
- independently documented
- independently branded
- independently testable
- independently maintainable

In short: SeaTurtle should keep the product behavior that matters while no longer depending on inherited implementation DNA.

## Core Principle

Do not treat research, inspiration, or a legacy implementation as source truth to be copied.

Use them as evidence and reference material only.

The real source of truth should become:

- SeaTurtle product intent
- behavior specifications
- acceptance tests
- architecture docs
- independently written code

## What "Clean Enough" Should Mean

A credible independence standard would look like this:

- SeaTurtle has its own runtime architecture.
- SeaTurtle has its own session, memory, and context model.
- SeaTurtle has its own command framework.
- SeaTurtle has its own config and filesystem conventions.
- SeaTurtle has its own docs, naming, comments, and UX copy.
- Feature parity comes from behavior specs and tests, not by porting code.
- Legacy compatibility is treated as temporary and explicitly tracked.

That is stronger than a rebrand. It is a rewrite with behavioral continuity.

## Why A Partial Rename Is Not Enough

Risk is not only in file names or visible strings.

Risk can also live in:

- module boundaries
- control flow
- data schemas
- comments and help copy
- naming patterns
- unique implementation choices
- compatibility layouts that preserve old lineage

If SeaTurtle keeps the same skeleton and mostly changes the paint, it may still feel and look like a derived implementation.

## Refactoring Helps, But It Is Not The End State

Refactoring inherited code can absolutely make it:

- less obviously similar
- less line-for-line comparable
- less trivial to match
- easier to maintain
- easier to replace in later waves

That is valuable.

But refactoring alone is not the same as strong independence.

Why:

- the same structure can survive
- the same control flow can survive
- the same implementation choices can survive
- the same subsystem relationships can survive

So the practical distinction is:

- refactoring can reduce obvious similarity
- refactoring can increase ambiguity
- ambiguity is not the same as ownership

SeaTurtle should not aim for "harder to compare."

It should aim for:

- independently implemented
- clearly owned
- defensibly distinct

The best use of refactoring is to expose seams, reduce chaos, and make replacement possible. It is the bridge to a cleaner implementation, not the final proof that the implementation is clean.

## Recommended Standard

Assume the safest serious target is a ground-up rewrite of the core product, while preserving only the product behavior you intentionally want.

Practical translation:

- keep the product spec
- rewrite the implementation
- port features intentionally
- retire inherited seams in waves

## Clean-Room Style Plan

The strongest engineering approach is a spec-first clean-room style process.

### Phase 1: Freeze The Product Surface

Document what SeaTurtle actually is.

Create or maintain:

- runtime behavior specs
- command behavior specs
- prompt and context architecture docs
- auth and provider behavior docs
- session and memory behavior docs
- operator docs

These should answer:

- what the feature does
- what input/output shape it has
- what errors and edge cases exist
- what state it reads and writes

Important:

- describe behavior
- do not copy old code into the specs

### Phase 2: Build A Provenance Wall

Separate:

- legacy implementation reference
- new SeaTurtle implementation work

Operationally, that means:

- new architecture docs are written from SeaTurtle intent, not from code paraphrase
- new files are authored fresh
- old files are not used as patch targets once a subsystem enters rewrite
- commit history clearly shows new subsystem creation and old subsystem retirement

Stronger version:

- one person or one pass extracts behavior/specs
- a separate implementation pass writes the new subsystem from the spec

### Phase 3: Rewrite The Core First

Rewrite the deepest product seams before the surface polish.

Priority order:

1. runtime loop
2. provider/auth seam
3. session and context architecture
4. command framework
5. tool execution framework
6. config and storage layout
7. UI/transcript rendering
8. feature commands and side systems

Why:

- if the heart stays inherited, the product stays inherited in practice

### Phase 4: Port Features By Behavior

For each major subsystem:

1. write or confirm the SeaTurtle behavior spec
2. write new implementation files
3. validate against acceptance tests
4. remove or gate the legacy subsystem
5. document what remains inherited, if anything

Do not:

- line-by-line translate
- preserve old comments
- preserve old naming just to save time
- preserve old file layouts unless they are truly the best layout

### Phase 5: Retire Legacy Compatibility

Anything kept only to preserve migration should be tagged as compatibility and tracked to removal.

Examples:

- legacy config directories
- legacy file names
- legacy environment variables
- legacy command aliases
- legacy protocol shims

Compatibility should be:

- explicit
- narrow
- temporary

Not the hidden center of the product.

## What Can Safely Survive

Lower-risk things to preserve in spirit:

- product ideas
- UX concepts
- workflow design
- command names you own
- architecture principles
- tests written from behavior
- documentation written fresh
- SeaTurtle-specific systems already developed here

Examples of SeaTurtle-native direction already worth preserving as product intent:

- context sanctity
- relationship stack
- `/autowork`
- `/mermaid`
- C4 integration
- SeaTurtle voice and posture system

These are product ideas, not reasons to preserve inherited code.

## What Should Be Rewritten Aggressively

Highest-risk areas to leave inherited:

- main runtime loop
- session orchestration
- prompt/context assembly
- command dispatch core
- tool execution and permission core
- auth and provider integration core
- storage/config home conventions
- low-level transcript/rendering engine if it still mirrors inherited structure

## Engineering Rules For A Safer Rewrite

Use these rules when the rewrite starts:

- No copy-paste from inherited implementation into new core files.
- No preserving comments from inherited files.
- No preserving old names unless they are necessary for compatibility.
- Prefer new module boundaries, not just new file paths.
- Prefer fresh tests derived from behavior specs.
- Record why each compatibility layer still exists.
- Keep architecture docs current as the new system replaces the old.

## Practical Repo Strategy

SeaTurtle can use this repository in two different ways:

### Option A: Transitional Laboratory

Use this repo as:

- the proving ground
- the behavior lab
- the feature incubator
- the architecture notebook

Then create a new repo for the true clean implementation.

Pros:

- cleanest long-term provenance
- easiest company story
- easier to explain internally and externally

Cons:

- more migration effort
- slower short-term shipping

### Option B: In-Place Replacement

Use this repo, but replace subsystem after subsystem until little inherited code remains.

Pros:

- faster continuity
- easier to preserve current momentum

Cons:

- provenance story is messier
- requires much stricter discipline
- easier to accidentally retain too much old implementation DNA

If the long-term goal is a company-shaped product, Option A is usually stronger.

## Release Standard Before Claiming Independence

Before saying SeaTurtle is truly free of inherited implementation concerns, you should be able to say:

- the runtime core is independently implemented
- the command system is independently implemented
- the session/context architecture is independently implemented
- config/storage conventions are SeaTurtle-owned
- docs and UX language are SeaTurtle-owned
- remaining compatibility shims are enumerated and temporary
- acceptance tests describe behavior without relying on old code

## Minimal First Rewrite Wave

If the rewrite started tomorrow, the best first wave would likely be:

1. write a behavioral spec for the runtime loop
2. write a behavioral spec for session/context assembly
3. write a behavioral spec for command dispatch
4. build a fresh SeaTurtle runtime skeleton
5. port one vertical slice end-to-end

Best vertical slice:

- startup
- auth status
- prompt turn
- one tool call
- one slash command
- session persistence

That is enough to prove the new skeleton can live.

## Strongest Final Posture

The most defensible path is not:

- "we renamed the fork well"

It is:

- "we used the old codebase as a temporary research and behavior reference, then replaced the implementation with SeaTurtle-owned architecture and code"

That is the posture that turns a fork-shaped beginning into a company-shaped product.

## References

These materials are useful context for understanding software copyright, derivative computer programs, and software architecture separation. They are evidence, not absolute truth.

- U.S. Copyright Office, Compendium Chapter 700:
  https://www.copyright.gov/comp3/redlines/chap700.pdf
- Computer Associates v. Altai:
  https://law.justia.com/cases/federal/appellate-courts/F2/982/693/125540/
- Oracle America, Inc. v. Google LLC:
  https://www.supremecourt.gov/opinions/20pdf/18-956_d18f.pdf
