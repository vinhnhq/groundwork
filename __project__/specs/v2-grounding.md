---
id: gw-spec-v2
kind: spec
title: Grounding & team sync
description: The Brain digest through three byte-identical doors, plus the team surfaces for PM and QA.
status: shipped
updated: 2026-08-06
---

# v2 — Grounding & Team Sync

> Status: **SPEC (drafted 2026-07-28).** Reframes Groundwork from a solo portfolio+ops
> tool (v1, shipped) into a **git-backed grounding layer for a mixed-agent team**.
> Supersedes the solo non-goal in `architecture.md §14`. Companion: `v1-foundation.md`.

---

## 0. The pivot, in one paragraph

v1 built the read side: Groundwork parses each repo's `__project__/**` Markdown and renders
tasks (DoR-gated), ADRs, specs, retro — one view across projects. v2 turns it into a **team
tool**. The team is mixed: an **engineer** (Vinh, uses Claude), a **PM** and a **QA** (use
their own agents — GPT/Claude — and _cannot_ use git). Two problems fall out of that reality,
and v2 exists to kill both:

1. **Grounding.** When PM/QA discuss with their agent, the agent lacks the project's docs, so
   it drifts and proposes work that conflicts with locked decisions. Fix: Groundwork renders one
   distilled **Brain digest** (current state + constraints + ready tasks) and serves it through
   two doors — a **live MCP tool** (any GPT/Claude agent) and a **copy-paste/export** (universal).
   Everyone's agent reasons from the same current truth.
2. **Sync without git.** Canonical tasks live in git-tracked `backlog.md`. The engineer is fine
   with git; PM/QA are not. Fix: a **git-free write-back** — they add/flip/annotate tasks in the
   UI, Groundwork commits/opens a PR under the hood. Git stays the transport; PM/QA never see it.
   (This is the git-backed-CMS pattern — Decap/Tina/GitBook — applied to project ops.)

**Load-bearing invariant (unchanged from v1):** the repo Markdown stays the single source of
truth. Groundwork reads it and writes back to it; it never becomes a second database of tasks.

---

## 1. Goal

Let a small team keep every member's AI agent grounded in the same canonical docs, and let
non-technical members read/update/sync tasks without touching git — while the Markdown in each
repo remains the one source of truth.

---

## 2. Out of scope (v2)

- **Multi-tenant SaaS / billing / hosted Cloud tier.** v2 is self-hosted (one shared instance or
  local). Cloud + metered billing is v5+ and a separate product decision.
- **Real-time multi-viewer** (Pusher/live cursors). SSE agent turns only; add liveness when a
  second concurrent editor actually exists.
- **Task _editing model_ beyond backlog.md** — no comments DB, no attachments store in v2 (repo
  assets per `architecture.md §7`). Status/annotation write-back only.
- **Non-Anthropic model providers** for the engineer's triage agent (the `model` seam stays; new
  providers are a later decision).
- **A public directory / marketplace of portfolios** (cross-user). That would force central
  hosting — explicitly deferred.

---

## 3. User stories & acceptance criteria

### US-1 — Engineer grounds their own Claude Code session (MCP, local)

As the engineer, I connect Groundwork's local MCP server to Claude Code so my session can pull
`ready_tasks` and the project Brain live.

- **AC:** `get_project_context(slug)` returns the current Brain digest; `ready_tasks(slug?)`
  returns only DoR-passing tasks across one/all projects; both reflect the on-disk docs with no
  stale cache. Read-only (no tool mutates a repo).

### US-2 — PM grounds a non-Claude agent (paste, universal)

As the PM using ChatGPT, I click **Copy context** on a project and paste the digest into my chat
so my agent stops drifting.

- **AC:** a "Copy context" affordance on the project view copies the same digest the MCP tool
  returns (single source); a `/ops/[project]/context.md` export route serves it as a file. The
  digest names the locked decisions and open constraints, sized to fit a chat (not the raw doc
  dump).

### US-3 — PM adds a task without git

As the PM, I capture a task in the UI and it lands in the repo's `backlog.md` as a PR — I never
run a git command.

- **AC:** submitting the task-capture form produces a commit/PR appending a DoR-shaped block to
  `backlog.md` on a branch; the UI shows the PR link and the pending state; the engineer's
  `git pull` (or merge) reflects it. No git knowledge required of the PM.

### US-4 — QA flips a status without git

As QA, I move a task from `ready` → `in-progress` → `done` in the UI and the change syncs back.

- **AC:** a status change writes back to the task's line in `backlog.md` (or moves it to
  `done.md` on `done`, per the write-once rule), via the same PR/commit path, attributed to the
  actor.

### US-5 — Deployed instance reads private repos from GitHub

As the team, we run one shared Groundwork instance (not on anyone's laptop) that reads our
**private** repos.

- **AC:** with a scoped `GITHUB_TOKEN`, the GitHub ContentSource reads `__project__/**` for each
  configured `owner/repo`; a push webhook revalidates the affected project; behavior is identical
  to the filesystem source behind the same `ContentSource` interface.

### US-6 — Idea triage stays grounded (existing feature, now real)

As the engineer, the triage agent drafts a ticket grounded in ≥2 real evidences, and **Accept**
writes it back through US-3's path (not the mock).

- **AC:** the mock analyzer is swappable for the Anthropic one when `ANTHROPIC_API_KEY` is set
  (existing seam); **Accept** invokes the real write-back; without a key, the mock still runs.

---

## 4. Capability map & build order (stop at any rung)

TDD-ordered; v2 detailed in the backlog, v3–v5 sketched (grounded per-DoR as each begins).

**v2 — Grounding (headline; cheapest high-value; no new infra)**

- **G1** `renderBrain(project) → digest` — pure, in the engine; the single source both doors use.
- **G2** Paste door — "Copy context" button + `context.md` export route.
- **G3** Local MCP server (stdio) — `list_projects` · `ready_tasks` · `get_project_context` ·
  `get_doc`. Read-only. Usable from Claude Code day one.
- **G4** Remote MCP (HTTP + token) — the team's shared endpoint (may trail v4 auth).

**v3 — Sync (git-free write-back)**

- **S1** `ContentSource` gains a write method (`appendTask` / `updateTaskStatus`); in-memory + fs.
- **S2** Local-git write-back (commit on a branch) — the engineer's machine.
- **S3** GitHub ContentSource (read) + push-webhook `revalidateTag`.
- **S4** GitHub write-back (open a PR) — the real PM/QA sync path.

**v4 — Team & auth**

- **F5** real better-auth (email+password) over Neon/Kysely — un-defers `db.ts` (was v1's stop).
- **R1** roles: engineer (full + agent) · PM/QA (task UI + grounding, no agent) · client (read).

**v5 — Packaging (open-core)**

- **P1** extract `@groundwork/engine` (workspace) — the pure core both hosts import.
- **P2** `@groundwork/cli init` + `groundwork.config.ts` scaffold (self-host).
- **P3** Cloud tier (metered, your key) — separate product decision; not before real self-hosters.

---

## 5. Non-functional

- **AI cost = BYOK / local subscription.** Self-hosted, the agent uses the runner's own
  `ANTHROPIC_API_KEY` **or** their local Claude Code subscription (flat fee, local only — a hosted
  server cannot borrow a subscription). No per-token cost to the tool. Metered-with-our-key is a
  v5 Cloud concern with per-tier caps.
- **Privacy.** Docs are private engineering ADRs; self-hosted means they never leave the team's
  infra. This is a deliberate trust property, not an accident — preserve it (no telemetry of doc
  content).
- **Grounding freshness.** MCP reads must reflect current docs (no stale cache). GitHub source
  sits behind `revalidateTag(project)` on webhook + `'use cache'` on aggregation (never reading
  request context inside — ADR-0012). Filesystem source needs no cache.
- **Write-back safety.** Default to **PR, not direct commit to main** (AI proposes / humans
  dispose). Token scoped to _Contents+PR: write_ on listed repos only.
- **Gates.** The four gates (`lint · tsc --noEmit · test:coverage · build`) green before any task
  → `done`. `lib/` coverage ≥ 90%. One Playwright smoke per shipped surface.

---

## 6. Open decisions → ADRs to write (as each phase begins)

- **ADR-0002** Write-back mechanism — PR vs direct commit (recommend PR for real repos, direct for
  solo scratch). _(v3, S2/S4)_
- **ADR-0003** DoR field spec + "evidence = ≥2 pointable proofs" rule (port from the v1 thread).
- **ADR-0004** Grounding digest — what `renderBrain` includes/excludes and its size budget; why a
  distilled digest beats raw-doc dump (the "PM drifts" failure). Descendant of infinite-oneness v6
  Project Brain. _(v2, G1)_
- **ADR-0005** Triage agent authority — read-only tools, proposes drafts only, human confirms
  write-back. Descendant of infinite-oneness ADR-0029. _(v3, US-6)_
- **ADR-0006** MCP surface & transport — tool contract; stdio (local) vs HTTP+token (remote/team);
  read-tools-first, no mutation tools in v2. _(v2, G3/G4)_
- **ADR-0001 amendment** — ContentSource: the GitHub adapter moves from "deferred" to in-scope
  (v3, S3); interface unchanged.
- **ADR-0007** Team pivot & delivery model — reverses the solo non-goal; open-core (self-host lib +
  optional Cloud), roles, BYOK/subscription cost model. The framing decision. _(records this spec)_

---

## 7. Delivery model (context, not v2 scope)

Open-core: a free self-hosted lib (`@groundwork/engine` + `cli init`, v5) drives adoption; a paid
tier (hosted Cloud, or team features self-host can't fake — SSO/roles/hosted-MCP) is the wedge.
Lead with the lib; build Cloud only once people self-host and ask you to run it. v2–v4 harden the
running app that both futures share; v5 packages it.
