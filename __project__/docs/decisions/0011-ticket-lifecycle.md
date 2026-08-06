---
id: gw-adr-0011
kind: adr
title: Ticket lifecycle & contention
description: merged ≠ released, Release as an aggregate, oracle-gated admission, atomic claims, and asymmetric human/agent preemption.
status: accepted
updated: 2026-08-06
---

# ADR-0011 — Ticket lifecycle, release verification, and contention

- **Date:** 2026-08-05
- **Deciders:** Vinh
- **Extends:** [ADR-0010](0010-ticket-storage-ownership.md) (Groundwork owns tickets)
- **Descends from:** infinite-oneness ADR-0029 (_AI proposes, humans dispose_)

## Context

Once Groundwork owns tickets it must own their **state machine**, and that machine has to survive a
team of five (1 PM · 3 devs · 1 QA) plus at least one unattended worker. Walking that team through a
week surfaced four things a naive `todo → doing → done` board gets wrong:

1. **QA does not verify per ticket.** QA writes detailed test cases into the ticket, developers
   automate as many as they can, and QA performs **one manual pass per release**. So "verified" is a
   property of a _release_, not of a ticket.
2. **Work is claimed by humans and machines competing for the same queue**, and a claim must be
   atomic or two workers duplicate effort.
3. **A ticket's scope can change while someone is implementing it**, and nothing detects that today.
4. **An agent reporting "done" is not evidence of done.** Models grade their own work generously and
   stop early.

## Decision

### 1. Two aggregates

```
Ticket:   draft → ready → claimed → in_review → merged ──────────┐
                    ▲        │                                    │
                    └────────┘  (release / preempt)               │
                                                                  ▼
Release:                       assembling → verifying → released ─┴─▶ ticket: released
                                                │
                                         reject ▼
                                  defects become NEW tickets (caused_by), never a re-open
```

- **`merged` is not `done`.** A ticket reaches `released` only when the release containing it passes
  QA's manual pass. This makes escaped-defect rate measurable, which a single terminal state cannot.
- **`blocked` is a flag, not a state** — a ticket can be blocked while `ready` or while `claimed`, and
  turning it into a state loses where it was. `blocked_by: [ticketId]` drives it; `next_task` never
  returns a ticket whose blockers are unreleased.
- **No re-open.** `released` is a fact that happened. A defect found later is a new ticket linked
  `caused_by` — an append-only stream must not have its past re-litigated.

### 2. Admission is gated on a machine-checkable oracle

A ticket cannot enter `ready` without an **oracle**: the command or assertion that proves it done.
Prose acceptance criteria are not sufficient — an agent cannot terminate on "works correctly", and
neither can a developer at 6pm. QA authors the test cases; the recorded `oracleAuthor` is the person
who wrote the check.

Fields, and who owns each:

| Field                  | Author  | Purpose                                                 |
| ---------------------- | ------- | ------------------------------------------------------- |
| `intent`               | PM      | Why this is worth doing                                 |
| `test_cases`           | QA      | How to verify, case by case, written to be automatable  |
| `oracle`               | dev     | The command running the automated subset                |
| `manual_checks`        | dev     | The residue QA must do by hand — **each with a reason** |
| `touches` / `must_not` | dev     | Declared blast radius, binding on unattended runs       |
| `automation_ratio`     | derived | `automated / total` — the debt signal                   |

`manual_checks` requiring a _reason_ is what stops the manual list growing silently. The release
verification script is then **generated** from the tickets in the release, never maintained by hand.

### 3. Priority is position, not a field

One ordered queue per project; the PM owns the order. Position _is_ priority. P1–P5 schemes collapse
into "everything is P1" within a quarter; two tickets cannot share a position.

### 4. Claims, contention and autonomy

- A claim is an event with an **expected-version guard**. Two claimants, one winner, the loser learns
  immediately. This is the single feature that made an event-sourced core worth its cost.
- **Preemption is asymmetric:** a human may preempt an agent's claim (the agent's work becomes a draft
  to take or discard); an agent may never preempt a human's. There is no such command.
- **Autonomy tier is an authorization property, not a convention.** The API token encodes a tier
  ceiling, so a misconfigured agent _cannot_ claim supervised work. A tier written only in a document
  is advisory, and advisory controls fail exactly when they are needed.
- **Overlapping `touches` warns, never blocks** at claim time, and the warning is recorded so its
  predictive value can be measured later.
- Agent claims carry a lease with a TTL; human claims never expire, but stale ones surface in a view
  and a lead may `ForceRelease` with a reason.

### 5. Two trust levels of events

| Source                    | Example                         | Status                      |
| ------------------------- | ------------------------------- | --------------------------- |
| Agent-asserted            | "I finished", "this is blocked" | a **claim about the world** |
| Observed (git/CI webhook) | PR opened, CI green, PR merged  | a **fact**                  |

Authoritative transitions come only from observed signals. `agent says done` + `PR exists` +
`CI green` → `merged`. Agent assertions require an idempotency key so a retry never double-counts.

### 6. Scope changes after a claim

Ticket content carries a `version`; a claim records `claimedAtVersion`. When content is revised
afterwards:

- **human claimant** → banner, and an explicit `AcknowledgeRevision` event
- **agent claimant** → automatic release and re-queue

An agent should not adjudicate whether a scope change invalidates its work; a human should, on the record.

### 7. Work in progress is capped at the constraint

Not one global cap — a cap per stage, and the constraint is not QA:

| Gate    | Cap on                     | Applies to                                   |
| ------- | -------------------------- | -------------------------------------------- |
| Claim   | open PRs awaiting review   | agents hard-blocked, humans warned           |
| Release | manual checks in the batch | flags batch-size risk before the pass starts |

## Consequences

**Accepted:** more states than a simple board, and two aggregates instead of one. The alternative —
`done` meaning "merged, probably fine" — is what makes escaped defects unattributable.

**Accepted:** `manual_checks` will grow unless someone watches `automation_ratio`. That number needs a
threshold and an owner, or the pre-release pass silently becomes a two-day job.

**Enabled:** a generated release checklist, honest cycle-time and rework metrics, safe unattended
work, and a queue a PM can reorder without negotiating priority labels.

**Revisit when:** releases become continuous. If every merge deploys, the Release aggregate collapses
into the ticket and §1 needs rework.

## Mirroring an external tracker

Should Groundwork ever read tickets _from_ Jira or Linear rather than own them, the constraints found
in evaluation apply: neither guarantees webhook ordering, both drop deliveries after a fixed retry
schedule, neither offers a replayable global cursor, and Jira's changelog pagination can skip or
duplicate entries under concurrent edits. The workable shape is: **treat a webhook as an invalidation
signal, not as data** — re-fetch the issue on every hint — plus a periodic reconciliation sweep, plus
a locally synthesized content hash standing in for the version they do not provide. Their state would
be a best-effort mirror; the events in §5 would remain ours.

## Alternatives considered

**One terminal state (`done` at merge).** Simpler, and standard for teams without a QA role. Rejected
because it makes the escaped-defect rate — the one quality number that matters here — unmeasurable.

**Per-ticket QA verification.** Was the first design. Rejected on contact with how this team actually
works: it makes one QA the per-ticket bottleneck for three developers and a machine, and it wastes the
scarcest skill on execution instead of specification.

**Priority as an enum.** Familiar. Rejected — see §3.

**Blocking on overlapping `touches`.** Safer-looking. Rejected: it invents a serialization the work
does not require, and two people genuinely can edit one file.
