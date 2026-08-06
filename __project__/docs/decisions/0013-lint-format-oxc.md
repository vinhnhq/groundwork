---
id: gw-adr-0013
kind: adr
title: Lint and format move to oxlint + oxfmt
description: Biome 2 is replaced by the oxc toolchain, closing backlog H6 and aligning groundwork with infinite-oneness and dev-workflow's own tooling.
status: accepted
updated: 2026-08-06
---

# ADR-0013 — Lint and format move to oxlint + oxfmt

Status: accepted · Decided: 2026-08-06 · Closes: backlog **H6**

## Context

Groundwork launched on Biome 2 (tech-standards §0) while infinite-oneness and the
`@vinhnnn/dev-workflow` package itself run oxlint + oxfmt. The published dev-workflow
templates are deliberately tool-agnostic — nothing forced this — but one engineer
maintaining two lint stacks pays a real cost: every rule decision, every editor setup,
every "why does this pass here and fail there" gets made twice.

The trigger was H4: Biome's config died on an unknown key, and lint validated nothing
for a week without anyone noticing. Worse, the investigation showed a sharper failure
mode — a `//` comment in strict `biome.json` makes Biome **silently fall back to a
default config** (no excludes, wrong formatter) rather than erroring. A gate that fails
open is worse than no gate.

## Decision

- **oxlint** lints, **oxfmt** formats (with `sortImports` replacing Biome's organize-imports).
  `bun run lint` = `oxlint && oxfmt --check .`; `bun run format` = `oxfmt .`.
- Config in `.oxlintrc.json` / `.oxfmtrc.json`, mirroring infinite-oneness with two
  groundwork specifics kept from the Biome config:
  - **The pure-core boundary survives the migration**: `no-restricted-imports` bans
    `react`/`react-dom`/`next/*` from `src/lib/**`, with the three ADR-0012 seam files
    (`context.ts`, `now.ts`, `auth/index.ts`) excluded by an explicit override — the
    same shape the Biome config had. Verified firing on a seeded probe.
  - `printWidth: 100` (the Biome line width), double quotes, 2-space — so the migration
    diff is import-spacing, not a total rewrite.
- `jsx-a11y/prefer-tag-over-role` is **off globally**, matching infinite-oneness. Under
  Biome the equivalent (`useSemanticElements`) was off for one file; oxlint's version
  flagged three _correct_ ARIA patterns in this small codebase (window-splitter resizer,
  caret listbox with `aria-activedescendant`, `role="status"` live region). A rule wrong
  three times out of three is miscalibrated for this codebase, not a guard.
- `src/components/ui/**` stays excluded from both tools (wrapper-over-pristine, ADR-0009).

## Consequences

- CSS and JSON are no longer formatted (Biome did both; oxfmt does not). Acceptable:
  `globals.css` was already excluded, and JSON churn is rare. Revisit if it bites.
- Biome-specific suppression comments (`biome-ignore`) were converted to oxlint
  directives where the rule still fires, or plain rationale comments where it does not.
- H6's sibling question — what a shared `dev-style.md` looks like — now has a single
  answer across both repos and the package.
- The H4 oracle still holds under the new tool: clean tree exits 0, seeded violation
  exits non-zero (verified at migration time).
