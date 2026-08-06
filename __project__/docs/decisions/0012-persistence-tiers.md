# ADR-0012 — Persistence tiers: what is event-sourced and what is not

- **Status:** **Accepted** (2026-08-05)
- **Date:** 2026-08-05
- **Deciders:** Vinh
- **Extends:** [ADR-0010](0010-ticket-storage-ownership.md) · [ADR-0011](0011-ticket-lifecycle.md)
- **Descends from:** infinite-oneness ADR-0007 §4 (the Decider calibration table) · ADR-0019 (CQRS/ES primer)

## Context

Groundwork now owns ticket data, and the reason for owning it is partly that **the history is the
product** — cycle time, rework, cost per feature, "why is this the way it is". That makes
event sourcing an obvious reach.

The obvious reach is also the trap. Event-sourcing everything means a projection to rebuild for every
read, an upcaster for every schema change, and three files to add a label — while most of the data
here has no invariant to protect and no history anybody will ever query. infinite-oneness ADR-0007 §4
already settled this calibration for a different domain: Decider for audit/replay/state-machine
aggregates, a plain deriver + controller for one-column updates.

There is also a subtler problem than "how much ES". Some data *looks* disposable but carries durable
knowledge — a comment recording a decision is the exact mechanism by which every Jira installation
becomes an archaeology dig.

## Decision

**Three tiers, not two.**

| Tier | Rule | Examples |
| ------ | ------ | ---------- |
| **1 · Strict ES** | Has an invariant that must hold at write time, or the history is the product | claims (expected-version guard), lifecycle transitions, release verification, cost ledger |
| **2 · Event the change, store the value** | No invariant, but *who changed this and when* matters | description / test cases, estimate, priority position, tier, assignee |
| **3 · Plain CRUD** | Latest wins; history is noise | comment text, labels, watchers, reactions, saved filters, UI preferences |

### Tier 2 is the interesting one

```
event:  ContentRevised { ticketId, version, hash, editor, at }   ← the fact
table:  ticket_content  { ticketId, title, description, ... }    ← the value
```

The event carries a **hash, never the prose**. The stream stays small and cheap to fold; attribution
is complete; and [ADR-0011](0011-ticket-lifecycle.md) §6 gets the `version` it needs to detect a scope
change after a claim. Replay is not required for a description — attribution is.

### The heuristic

> If someone might one day ask **"who changed this, and why?"** — it is at least tier 2.

Estimates, priority and tier pass. Emoji reactions do not.

### Cost is its own stream

The cost ledger is append-only and keyed by ticket id, but it is **not part of the Ticket aggregate**.
Cost events arrive asynchronously from sessions and affect no ticket invariant; folding hundreds of
them to check one claim would be pure waste. Join in the projection.

### Comments

Comment text is tier 3 — edit and delete freely. But a comment that records a **decision** is durable
knowledge sitting in a mutable field, which is precisely how rationale gets lost.

**`CommentPinnedAsDecision` is an event.** The pin is an immutable fact; the text stays editable. The
pin is also what triggers [ADR-0010](0010-ticket-storage-ownership.md)'s graduation rule — a pinned
decision must reach an ADR or spec in the repo before the ticket can close.

## Consequences

**Accepted:** three storage patterns in one codebase, and a judgement call for each new field. The
tier table plus the heuristic make it a two-minute decision rather than a debate.

**Accepted:** tier 2 gives attribution without replay. If a full point-in-time reconstruction of a
description is ever needed, that data is not in the stream — only its hash. Judged acceptable: nobody
has asked to replay prose, and storing it would grow the stream without bound.

**Enabled:** the analytics that justify owning the data, without paying ES ceremony on saved filters.

**Revisit when:** an aggregate is being written for something a single `UPDATE` would express. That is
the calibration test failing, and it means this table needs a fourth row or a correction.

## Alternatives considered

**Full ES everywhere.** Uniform, elegant, and the reason many event-sourced systems are unpleasant to
extend. Rejected on the same grounds ADR-0007 §4 rejected it: ceremony where there is no invariant.

**No ES at all — append-only audit table plus current-state tables.** Genuinely viable, and roughly
30% of the complexity: it delivers cycle time, rework and cost analytics perfectly well. Rejected for
one specific reason — **the claim lock**. An expected-version guard *is* the mutex that lets a human
and an unattended worker share a queue safely, and an audit table cannot enforce it at write time.
Had claims not needed atomicity, this would have been the right answer, and it is worth remembering
that the whole ES case rests on that one feature.

**ES for tier 2 as well** (full events carrying prose). Rejected: unbounded stream growth to serve a
question — replaying an old description — that nobody has asked.
