---
id: gw-retro-log
kind: retro
title: Retro
description: Dated retrospectives — what a session shipped, what it taught, and what it changed about how we work.
status: active
updated: 2026-08-06
---

# Retro

## 2026-08-06 — PR #8: eight days of local work reach CI, and the gate that would have caught it was dead

**Shipped** (28 commits, merged as `df44fff`): the W1–W7 workspace-UX series, the triage
message-thread rebuild with the @-mention file picker, the resizable sidebar, ADRs 0010–0013,
dev-workflow 3.0.0→3.0.1, the H4 lint-gate revival, RV2's read-only token docs, and the full
Biome → oxlint + oxfmt migration (ADR-0013, closing H6) ending at zero lint diagnostics.

**What went wrong, and why it is the interesting part:**

- **The lint gate failed open for a week.** Biome died on an unknown config key, so `bun run lint`
  validated nothing while 21 commits accumulated locally. Worse, the "obvious" fix — a `//` comment
  in strict `biome.json` — made Biome _silently fall back to a default config_, which is a second,
  quieter failure-open mode. A gate that reports failure loudly is infrastructure; one that fails
  open is a rumor. The `--strict` CI gate (H5) exists for exactly this class.
- **The branch outgrew reviewability.** 150 files and +9k lines before the first CI run. Nothing
  in it was broken, but nothing in it was _verified_ either, and the two are indistinguishable
  from the outside. Smaller, earlier PRs are the fix; the ship ritual only works per-PR.
- **RV1 tripped its own escalate-if before starting.** The backlog said "~690 lines, no caller";
  the tree said ~1,300 lines with a live route. A ticket written from memory of the code, not from
  the code, fails its own DoR — re-grounding it produced the RV1a/RV1b split and surfaced a real
  product question (capture goes dark before T2?) that the original ticket hid.

**What worked:**

- **The fresh-context QA pass earns its cost.** It re-ran every gate, then found in ten minutes
  what the author never would: the @-menu clipping at phone width (the "never clipped" e2e only
  pinned 1280×860), plus an inaccuracy in the PR body itself ("no tests deleted" — two were,
  legitimately). Verdict-driven fix-forward beat a checkbox review.
- **Warnings resolved by kind, not silenced.** The oxc migration's 17 leftover warnings split
  cleanly: 12 real fixes, 5 precise configuration (`allowAsProps` is the rule's own carve-out;
  function-scoping off in tests trades allocation nobody measures for locality everyone reads).
  The tree ends with exactly three disable directives, each one line with its rationale.
- **Machine-written files need machine-safe gates.** `__project__/tasks` is appended by the
  session hook and the events workflow, neither of which formats — excluding it from
  `oxfmt --check` prevented a future CI failure on files no PR touched.

**Carried forward:** RV1a's capture-gap decision · the `TICKET_EVENTS_ENABLED` flip (after the
upstream closed-unmerged→`released` typing bug in dev-workflow is fixed) · H1–H3 authored docs,
then H5 `--strict` · H7 guard-hook wiring · Q8.1–Q8.3 from the QA pass.
