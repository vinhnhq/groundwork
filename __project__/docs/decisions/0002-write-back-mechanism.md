---
id: gw-adr-0002
kind: adr
title: Write-back mechanism (superseded)
description: A separate writer seam defaulting to a PR. Superseded by ADR-0010 — write-back is removed, not deferred.
status: superseded
updated: 2026-08-06
---

# ADR-0002 — Write-back mechanism: a separate writer seam, defaulting to a PR

Decided: 2026-07-28 · **Superseded 2026-08-05 by [ADR-0010](0010-ticket-storage-ownership.md)** —
write-back is removed, not deferred. Read this for the reasoning that led there; do not build from it.

## Context

v2's second problem (spec `v2-grounding.md` §0) is sync without git: the PM and QA cannot run git,
but the canonical tasks live in a git-tracked `backlog.md`. They need to add tasks and flip
statuses from the UI, and those changes must land in the repo — without Groundwork becoming a
second database of tasks, which is the load-bearing invariant from v1.

Two questions fall out: **where the write capability lives in the code**, and **how a change
reaches the repo**.

## Decision

### Writes live on their own seam, not on `ContentSource`

The v2 spec sketched this as "`ContentSource` gains a write method". It is instead a separate
`BacklogWriter` interface, because the two axes vary independently:

- `ContentSource` answers _where the docs are read from_ — filesystem now, GitHub when deployed.
- `BacklogWriter` answers _how a change lands_ — straight to disk, a git branch, a pull request.

Those compose in combinations neither can express alone (filesystem read + PR write is a perfectly
sensible local setup). More importantly, keeping `ContentSource` read-only is what lets the MCP
layer be read-only **by type** (ADR-0006) rather than by discipline: there is no write method on
the interface it holds, so no amount of prompting reaches one.

The write path is therefore read-modify-write against the current file, every time: read the
canonical `backlog.md`, apply a pure transform (`serialize.ts`), hand the whole new content to the
configured writer. Nothing is cached, and no task is ever recorded anywhere but the repo.

### `serialize.ts` is the inverse of `parse-backlog.ts`

Round-tripping is asserted directly in tests rather than eyeballed, because these two drifting
apart corrupts the file that is the project's single source of truth. `setTaskStatus` rewrites
exactly one marker character and leaves every other byte alone — a test asserts the diff is a
single line — so a status flip can never reformat someone's hand-curated backlog.

New tasks are **appended**, not slotted into the section they arguably belong in. Guessing at
placement would silently reorder a human-curated file; a human (or the PR review) moves it.

### Default transport: PR, not a direct commit

For real repos the default is **open a pull request**, following "AI proposes, humans dispose":

- The PM/QA are not reviewing the Markdown they generated — the engineer is, and a PR is the
  review surface that already exists.
- A task captured through an agent-assisted flow is a _proposal_. Committing it straight to `main`
  gives an unreviewed suggestion the same authority as reviewed work.
- It is reversible by construction. A bad direct commit to `main` needs a revert; a bad PR needs a
  close.

Direct-to-disk (`filesystem`) stays available for a scratch repo or a solo working tree where the
edit _is_ the intent, and direct-to-branch (`git-branch`) for the engineer's own machine.

### Default when nothing is configured: a dry run

With no git identity and no GitHub token, the writer is the **memory** writer: it renders the
exact new file content, records the request, and persists nothing. Every `WriteOutcome` carries a
`pending` flag, and the UI states plainly that nothing was committed.

The alternative defaults are both worse: silently mutating whatever working tree the server
happens to be running in, or a write path that only ever executes in tests and so is discovered to
be broken the first time it matters.

## Consequences

- Adding a transport means implementing one interface with one method; it needs no change to the
  read layer, the UI, or the pure transforms.
- `WriteOutcome.pending` must be honoured by every surface that reports success. "Saved" is a lie
  when the change is sitting in an unmerged PR.
- Read-modify-write has no optimistic concurrency: two people flipping different tasks in the same
  backlog within the same moment can clobber each other. With a team of three and a PR in the
  path, the PR diff surfaces it. If this becomes real, the fix is a content hash on the read and a
  conflict error on mismatch — not a lock.
- Status `done` flips the marker in place rather than moving the task to `done.md`. The spec's
  US-4 allows either; in-place keeps the transform to a single character and avoids inventing a
  file-migration rule inside a write path. Revisit when `done.md` is actually load-bearing.
