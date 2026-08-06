# ADR-0010 — Tickets live in Groundwork; docs live in the repo

- **Status:** **Accepted** (2026-08-05)
- **Date:** 2026-08-05
- **Deciders:** Vinh
- **Reverses:** the §14 non-goal *"the dashboard never becomes a second source of truth"* (task half only) · the README line *"it never becomes a second database of tasks"*
- **Supersedes:** [ADR-0002](0002-write-back-mechanism.md) — write-back is removed, not deferred
- **Amends:** [ADR-0001](0001-content-source.md) — the content source stays, its scope narrows to docs

## Context

v1/v2 put every task in the repo's `backlog.md` and gave non-technical members a **write-back** path:
edit in the UI → commit or PR → the file changes. The dashboard was a projection with a thin write
channel, and the rule was that it must never own task data.

Three things have since made that shape the expensive one:

1. **Write-back is the messiest component in the system.** Branch creation, PR management, conflict
   resolution, and merge-timing — all to mutate a Markdown file that a database mutates trivially.
2. **A single file is a contended resource.** With one PM, three developers, a QA and an unattended
   worker, `backlog.md` collects conflicting edits daily, and `done.md`'s newest-at-top convention
   guarantees a conflict on every concurrent merge.
3. **Coordination state does not belong in git at all.** Who holds a claim, what a ticket cost, and
   what is queued for verification are not facts about the code — they are facts about the people and
   agents working on it, they change many times an hour, and none of them belong in a commit.

The opposite pressure is real and unchanged: an agent editing code needs rationale *in the repo*,
because it cannot retrieve a document whose existence it cannot infer. Docs that move to a database
stop being discoverable by the grep that finds them today.

So the question was never "repo or database" — it was **which half goes where**.

## Decision

**Split by kind of data, not by convenience.**

| Data | Home | Rationale |
| ------ | ------ | ----------- |
| ADRs, specs, architecture, runbook, code comments — **rationale** | **the repo** | Consulted while editing; must be grep-able, diffable, versioned with the code, and readable with no network |
| Tickets, claims, status, priority, cost, verification — **coordination** | **Groundwork's database** | Multi-actor, high-churn, needs atomicity and cross-project queries; inert to an agent mid-edit |

Consequences that follow directly:

- **Write-back is deleted.** Tickets are created and edited in Groundwork. Nothing is written to a repo.
- **The GitHub token becomes read-only.** No write scope, no branch creation, no PR machinery.
- **`backlog.md` is no longer a source of truth.** For an existing repo it is imported once; for a new
  project it is never created. The backlog grammar in `@vinhnnn/dev-workflow` becomes a **migration
  tool**, not an ongoing gate.
- **Two join keys, both permanent:** `project.yml`'s `slug` joins a repo to a Groundwork project;
  the ticket id joins a ticket to commits, events and cost rows.

## Consequences

**Accepted — the repo stops being self-describing.** Six months on, a reader of `discovery-data.ts`
cannot find *why* it is shaped that way unless something points out of the code. Two mitigations, both
required, neither optional:

- **Every commit message carries a ticket id** (`commit-msg` hook; `NOTICKET` allowed, and CI files a
  retroactive ticket). `git blame` then resolves any line to its ticket.
- **The graduation rule:** a decision made during a ticket must reach an ADR or a spec *in the repo*
  before that ticket can close. Without it, rationale accumulates in ticket comments and the system
  reproduces the archaeology problem it was built to avoid — see [ADR-0012](0012-persistence-tiers.md)
  §Comments.

**Accepted — Groundwork becomes a system of record.** Losing its database now loses real data, so
backups and export stop being optional. Every project must be exportable to plain files on demand;
a tool that can hold your work hostage is not one a small team should adopt.

**Enabled:** atomic claims (impossible over git), cost attribution per ticket, cross-project queues,
real-time collaboration, non-technical members as first-class participants, and a tenfold simpler
integration surface now that no write path exists.

**Revisit when:** a customer requires that tickets live in their own repo for compliance. The export
path above is the seam that answers it.

## Alternatives considered

**Keep write-back (status quo).** Preserves the purity of "the repo is everything" and needs no
backups. Rejected: it is the most complex component, it makes non-git members second-class, and
`backlog.md` cannot express a claim atomically — which is the one thing an unattended worker needs.

**Everything in the repo, including coordination** (one file per event, committed). Genuinely
attractive: zero infrastructure, works offline, no service to run. Rejected once a shared deployed
instance became a requirement — the moment a PM without git participates, this shape cannot serve
them, and claim contention becomes eventually consistent exactly where it must not be.

**Everything in the database, including docs.** Simplest to build and the worst outcome for the
primary user of those docs. An agent cannot grep a database, and the rationale it needs most is the
kind nobody thinks to attach to a ticket.

**Layer on Jira/Linear instead of owning tickets.** Deferred rather than rejected — see
[ADR-0011](0011-ticket-lifecycle.md) §Mirroring. Their change feeds have no ordering guarantee, no
replayable cursor, and lossy history, so any analytic built on them is built on a best-effort mirror.
Owning the lifecycle is what makes the numbers defensible; syncing *outward* to their UI stays
available as a display option.
