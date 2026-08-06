---
id: gw-adr-0007
kind: adr
title: Team grounding pivot
description: Reverses the solo non-goal: v2 is explicitly a small-team tool for engineer, PM and QA together.
status: accepted
updated: 2026-08-06
---

# ADR-0007 — Team grounding pivot & delivery model

Decided: 2026-07-28

## Context

v1 shipped Groundwork as a **solo** portfolio + ops tool (`architecture.md §14`:
"No multi-user / team boards (solo)"). In use, the real problem is a **team** one. The
team is mixed: an **engineer** (uses Claude), a **PM** and **QA** (use their own agents —
GPT/Claude — and cannot use git). Two failures dominate:

1. **Agent drift.** PM/QA discuss with their agent, which lacks the project docs, so it
   proposes work conflicting with locked decisions.
2. **Sync friction.** Canonical tasks live in git-tracked `backlog.md`; PM/QA can't operate
   git, so they fall out of sync.

Neither is solved by the solo framing. Both are squarely a grounding + sync problem.

## Decision

**Reframe Groundwork as a git-backed grounding layer for a small mixed-agent team.** Two
headline capabilities (spec `specs/v2-grounding.md`):

1. **Grounding.** `renderBrain(project)` produces one distilled current-truth digest served
   through **two doors, one source**: a live **MCP** tool (any GPT/Claude agent) and a
   **copy-paste/export** (universal, zero-setup). Both return the identical digest.
2. **Git-free write-back.** Non-technical members add/flip/annotate tasks in the UI;
   Groundwork commits / opens a PR to the repo's `backlog.md` underneath. Git stays the
   transport; PM/QA never see it. The repo Markdown remains the single source of truth.

**Delivery = open-core.** A free self-hosted lib (`@groundwork/engine` + `cli init`, v5)
drives adoption; the paid wedge is a hosted **Cloud** tier or team features self-host can't
fake — built only once real self-hosters ask. **AI cost = BYOK / local Claude subscription**
(flat-fee, local only; a hosted server cannot borrow a subscription — that's the one thing
Cloud-with-our-key + per-tier caps would add later).

This **reverses** the solo non-goal in `architecture.md §14`.

## Rationale

- The content is private engineering docs → self-hosted BYOK is a stronger trust story than
  any SaaS, and removes token-cost risk from the tool.
- Both GPT and Claude speak MCP, so one server grounds the whole team; paste is the universal
  floor. Not two products — one digest, two doors.
- The pure-core / imperative-shell discipline from v1 already isolates the reusable engine,
  so open-core packaging is a `mv` + workspace, not a rewrite.

## Consequences

- **What v1 keeps:** the invariant that the dashboard never becomes a second task DB — it
  reads and writes *back to* the repo. Write-back is additive, not a new store.
- **New scope:** the GitHub ContentSource (read) moves from deferred to in-scope (ADR-0001
  amendment, v3/S3); write-back needs a PR path (ADR-0002); the MCP surface needs a contract
  (ADR-0006); the digest needs a size/selection policy (ADR-0004).
- **Auth graduates** from mock to real (v4/F5) because a shared team instance needs identity
  + roles (engineer full+agent · PM/QA task-UI+grounding · client read-only).
- Multi-tenant SaaS / billing stays out of scope until v5+ (a separate product decision).

## Enforcement

- The reversal is recorded in `architecture.md §14` (struck, pointing here) and the
  *Current state* block; the build is DoR-tagged in `tasks/backlog.md` (v2 = G1–G4).
- Downstream ADRs (0002/0004/0005/0006 + the 0001 amendment) open **as each phase begins**,
  not upfront — per the "defer machinery" principle.
