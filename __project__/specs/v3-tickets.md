---
id: gw-spec-v3
kind: spec
title: Tickets — the coordination half
description: Groundwork owns tickets in its database; triage becomes the front door for creating them; observed git events drive their state.
status: draft
updated: 2026-08-08
---

# v3 — Tickets: the coordination half

> Status: **DRAFT — awaiting Vinh's review; nothing here is locked.** Drafted 2026-08-08 by the
> agent from [ADR-0010](../docs/decisions/0010-ticket-storage-ownership.md) ·
> [ADR-0011](../docs/decisions/0011-ticket-lifecycle.md) ·
> [ADR-0012](../docs/decisions/0012-persistence-tiers.md) and the product direction Vinh stated in
> session (triage-as-creation, create-loosely / admit-strictly). §6 lists every decision this draft
> takes a position on without authority; each needs a yes, a no, or an edit before the build starts.
> Implements the reversal recorded in the three ADRs; supersedes the task half of
> `architecture.md` §3/§4/§9 (flagged stale in CLAUDE.md since 2026-08-05).

---

## 0. The reversal, in one paragraph

v2's answer to "how does a PM change a task without git" was write-back: UI → branch → PR → the
repo's `backlog.md` changes. ADR-0010 reversed it after it shipped: coordination data (tickets,
claims, status, priority, cost) is multi-actor and high-churn and belongs in Groundwork's own
database; only **rationale** (ADRs, specs, retro) stays canonical as Markdown in each repo. v3 is
the build the reversal describes: a `tickets` schema, **triage as the front door for creating
them**, a queue the PM owns by position, and lifecycle transitions driven by **observed** git
events rather than anyone's say-so. `backlog.md` gets imported once and retires as a source of
truth.

## 1. Goal

A PM, a QA, a developer and (later) an unattended agent share one ticket queue per project —
created conversationally against the project's real docs, admitted to `ready` only with a
machine-checkable oracle, claimed atomically, and advanced by webhook facts. The repo keeps the
why; Groundwork keeps the what-and-who.

## 2. Out of scope (v3)

- **Mirroring Jira/Linear** in either direction — ADR-0011 §Mirroring records why (no ordered,
  replayable change feed to build on).
- **Agent claims / the tier-ceiling token** (T5) — the door for unattended workers needs T2+T3
  live first; designing the token before a second worker exists is speculation (ADR-0011 §4 note
  on T3's timing applies to T5 doubly).
- **A cost dashboard** — T4's ledger lands as an append-only stream only; visualizing it is v4.
- **Editing docs from the UI** — rationale stays repo-only, by decision, forever (ADR-0010).

## 3. User stories & acceptance criteria

### US-1 — An idea becomes a draft ticket through conversation

PM (or anyone with `triage.run`) types an idea into the triage workbench, optionally @-tagging
docs. The agent analyzes against the project's actual docs and answers duplicate / overlaps /
needs-spike / new-task with citations, drafting `intent` and a tier guess. **Accept creates a row
in Groundwork's database** — status `draft`, no repo write, no branch, no PR.
_Acceptance:_ the triage flow that today emits a dry-run backlog block instead inserts a ticket;
the transcript view shows it; `/ops/<project>/tasks` lists it as DRAFT immediately.

### US-2 — The team grounds a draft to `ready` (admit strictly)

A draft only needs `intent` to exist. `ready` requires the full DoR set, and ADR-0011 §2 assigns
authorship: PM `intent` · QA `test_cases` · dev `oracle` + `touches`/`must_not` + `manual_checks`
(each manual check with a reason). The gap pill (Q8.3's shared labels) names what is missing and,
new in v3, **whose it is**. `automation_ratio` derives.
_Acceptance:_ a ticket cannot reach `ready` with a missing oracle; the transition is an event
carrying who admitted it; the DoR pill shows per-field ownership.

### US-3 — Priority is position

One ordered queue per project; drag to reorder; the PM owns the order; two tickets cannot share a
position (ADR-0011 §3). The tasks table/board (W3) becomes a read of the DB instead of
`parseBacklog`, keeping its filters and phone cards.
_Acceptance:_ reorder persists as a tier-2 event (`PriorityRepositioned`, hash-only per ADR-0012);
`next_task`-style reads return queue order; the board renders identically at 390px.

### US-4 — Observed events advance the lifecycle

`wip/<id>` branches and `[ID]`-prefixed PR titles join commits to tickets (ADR-0010's join key).
The GitHub webhook (extending S3's signed endpoint) records PR opened → `in_review`, merge →
`merged`. Agent/human assertions of "done" are recorded as claims-about-the-world, never as
transitions (ADR-0011 §5). A replayed delivery is idempotent.
_Acceptance:_ T1's oracle verbatim — a PR opened, reviewed and merged in a watched repo produces
the right rows with correct ticket ids; a replay produces no duplicates.

### US-5 — A claim is atomic

A developer claims the top `ready` ticket; the claim is an event with an expected-version guard —
two claimants, one winner, the loser learns immediately (the single feature the ES core exists
for, ADR-0012 §Alternatives). Human claims never expire; a scope revision after a claim shows the
ADR-0011 §6 banner and requires `AcknowledgeRevision`.
_Acceptance:_ concurrent claims in a test produce exactly one winner; the revision banner appears
when content `version` moves past `claimedAtVersion`.

### US-6 — One-shot import, dogfooded on this repo

`parseBacklog` runs once per existing repo as a migration tool (its last duty — ADR-0010) and
produces tickets with intent, oracle, evidence and tier intact; ids are preserved. Groundwork's
own backlog is the first import and the acceptance fixture.
_Acceptance:_ importing this repo yields one ticket per open backlog task with DoR fields
faithful; re-running is a no-op (idempotency key on source line hash).

### US-7 — Export, because system-of-record is a hostage risk

Every project exports to plain files on demand — tickets as Markdown/JSON, streams as JSONL
(ADR-0010 §Consequences says this is not optional once the DB owns real data).
_Acceptance:_ export → wipe a scratch DB → import → byte-identical re-export.

### US-8 — `merged ≠ released` (Release aggregate)

QA assembles a release from merged tickets; the verification checklist is **generated** from their
`test_cases`/`manual_checks`; pass moves every ticket to `released`; a defect becomes a new ticket
linked `caused_by`, never a re-open (ADR-0011 §1).
_Acceptance:_ the generated checklist matches the tickets in the release; reject leaves tickets
`merged` and files linked defects.

## 4. Build order (stop at any rung, map to backlog T-ids)

| Rung | Ships                                                                          | Backlog |
| ---- | ------------------------------------------------------------------------------ | ------- |
| 1    | Schema (three persistence tiers) + one-shot import, dogfooded on this repo     | T2      |
| 2    | Triage Accept → ticket row; tasks table/board reads the DB; capture UI retires | RV1a/b  |
| 3    | Observed-event ingest: signed webhook → append-only stream, idempotent         | T1      |
| 4    | Grounding to `ready` with per-field ownership; queue-position reorder          | (new)   |
| 5    | Claims with expected-version guard + revision banner                           | T3      |
| 6    | Export/import round-trip                                                       | T6      |
| 7    | Release aggregate + generated checklist                                        | (new)   |
| 8    | Cost ledger stream (write side only)                                           | T4      |

Rung 3 is deliberately after 2 despite T1's "deadline" framing: the interim
`TICKET_EVENTS_ENABLED` repo-variable capture (files under `tasks/events/`, importable later)
holds history meanwhile — but it stays OFF until the upstream dev-workflow `released`-typing bug
is fixed, which is in progress.

## 5. Non-functional

- **Persistence per ADR-0012, mechanically:** tier 1 (streams + expected-version) for claims,
  transitions, release verification, cost; tier 2 (event the change, store the value, hash never
  prose) for content, estimate, position, tier, assignee; tier 3 CRUD for comments, labels,
  watchers. `CommentPinnedAsDecision` is an event and triggers the graduation rule.
- **Auth is the existing role matrix** (ADR-0008): `tickets.create` ≈ triage.run; reorder is
  PM-only; claiming needs `tickets.claim` (engineer); no new auth machinery in v3.
- **No new infra.** Same Neon database, same Kysely; the event tables are rows, not a broker.
- **Commit discipline starts at rung 3:** every commit carries a ticket id (`NOTICKET` allowed,
  CI files retroactively) — ADR-0010's mitigation, currently unenforced.

## 6. Open decisions — for Vinh, before or during rung 1

1. **RV1a resolution (proposed here):** capture/status-flip UI stays until rung 2 replaces it in
   the same PR — no capability gap, and RV1b's delete follows immediately. Alternative: dark now,
   two-step. _This draft assumes the first._
2. **Ticket id scheme.** Import preserves `S1.1`-style ids; what mints new ones — per-project
   prefix + counter (`GW-101`)? Random short ids? The id is a permanent join key (ADR-0010), so
   this is a one-way door.
3. **ADR-0003 / Q3 interplay.** Import treats a title-only backlog task as `intent = title`
   (else the dogfood import yields 59 drafts and zero ready). Is that rule also the app's rule, or
   import-only? This is the ADR-0003 that was never written.
4. **Release aggregate timing.** US-8 assumes QA joins during v3. If that's months out, rung 7
   slides to v4 and `merged` is temporarily terminal — ADR-0011 §Revisit acknowledges the
   collapse case.
5. **Decider port.** Reuse infinite-oneness's Decider/fold machinery (proven, but built for a
   different domain) or a minimal local `applyEvent` per aggregate? ADR-0012's calibration table
   suggests the minimal one; the claim guard is the only hard invariant.
6. **Where does `done.md` end up?** After import, the done archive and session log are history,
   not coordination — proposal: they stay repo-side untouched, and T2 does not import them.

## 7. What this spec supersedes

The task half of `architecture.md` §3 (component map: write-back boxes), §4 (backlog ingestion as
ongoing), §9 (triage promoting into `backlog.md`), and §1's "never becomes the place you edit a
task" principle — all already reversed by ADR-0010; this spec is the build plan the reversal was
missing. The doc-projection half of all three sections stands.
