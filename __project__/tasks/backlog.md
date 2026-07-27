# Backlog — TDD-ordered, DoR-tagged

> Each leaf: **red → green → refactor → commit**, atomic. A task starts only when it passes the **Definition of Ready** (intent · autonomy tier · Touches/Must-NOT · Oracle · ≥2 evidences · Escalate-if). DRAFT = discuss first.
> Status: ✓ done · → in progress · · ready · ✎ draft (not ready) · ⏸ blocked · ↷ stretch
> Autonomy: **S**upervised · **P**lan-gated · **D**ark · **T**rivial (tech-standards §0/DoR).

Dogfooding note: Groundwork has its OWN `__project__/` docs + (soon) `project.yml`, so it appears as a project in itself — the first end-to-end test of ingest + DoR.

---

## v1 — Foundation (rungs 1–4)

> **Status 2026-07-25:** F0–F4 + F6 SHIPPED (autonomous build, gated per rung — see done.md).
> **F5 (auth) is the intended stop point — blocked on a Neon `DATABASE_URL` + `BETTER_AUTH_SECRET`
> (owner-provided).** The ops console runs read-only against local repos today.
>
> Dogfood finding: pointed at its own root, Groundwork parses its 9 tasks but flags most as DRAFT
> "missing intent" — because these tasks carry intent in the title, not an explicit `**Intent:**`
> field. The DoR gate policing its own backlog, working as designed. Follow-up: add explicit
> `**Intent:**` lines to future tasks (or relax the parser to treat the title as intent — a real
> product decision for v3's triage draft-ticket format).

- [x] **F0.1** Scaffold Next 16 + pinned stack + toolchain. *(2026-07-24)*
- [x] **F1.1** Core lib seam — result/pipe/clock/repository/context + tests. *(db.ts/db-pool.ts runtime singletons deferred to F5; 2026-07-24)*
- [x] **F2.1** ContentSource: `project.yml` parser + filesystem adapter. *(2026-07-25)*
- [x] **F2.2** Markdown → RSC renderer (react-markdown + mermaid + relative-image rewrite). *(shipped in F4; 2026-07-25)*
- [x] **F3.1** Task model + DoR deriver + backlog parser. *(2026-07-25)*
- [x] **F4.1** `/ops` overview — project list + READY queue + DRAFT list. *(2026-07-25)*
- [x] **F4.2** Project detail + doc render pages + asset route. *(2026-07-25)*
- [x] **F6.1** Dogfood (Groundwork ingests itself) + ADR-0001 + status. *(2026-07-25)*

### F5 · Auth gate (rung 4)  → **[P]**  ⏸ blocked on owner-provided Neon creds
- ⏸ **F5.1** better-auth (email+password, single admin) over Kysely/Neon; migration for the auth tables (integer `users.id` override per tech-standards §7); `src/proxy.ts` gates `/ops/**`; `/` public; the `NODE_ENV`-gated dev-session E2E seam. Also un-defers `db.ts`/`db-pool.ts`.
  - **Intent:** gate the private ops console behind a session; keep `/` public.
  - **Touches:** `src/lib/{db,db-pool,auth,auth-client}.ts`, `src/db/**`, `src/proxy.ts`, `src/app/sign-in/**`. **Must NOT:** the content/tasks read layer.
  - **Oracle:** integration test (session lookup) + Playwright: signed-out `/ops` → redirect to sign-in; signed-in → ops home.
  - **Evidence:** tech-standards §7 (better-auth schema + integer-id footgun) · spec v1 story 4.
  - **Escalate if:** `@better-auth/kysely-adapter` needs a Kysely version other than the pinned `^0.28`.

---

## v2 — Grounding & Team Sync  (spec: `specs/v2-grounding.md`)

> **The pivot (2026-07-28):** solo tool → **grounding layer for a mixed-agent team**
> (engineer + PM + QA). Two problems: keep everyone's agent grounded in the same docs
> (Brain digest → MCP + paste), and let non-git teammates sync tasks (git-free write-back).
> Portfolio (old v2) + mock-triage (old v3) already shipped in v1. Reverses the solo
> non-goal in `architecture.md §14` — see **ADR-0007**.

### G · Grounding (headline — cheapest high-value, no new infra)

- · **G1** `renderBrain(project) → digest` — pure digest (current state + locked decisions + open constraints + READY tasks) that any agent consumes.  → **[P]**
  - **Intent:** one distilled, size-bounded current-truth digest per project so mixed-agent teammates stop drifting from locked decisions.
  - **Touches:** `src/lib/brain/{render-brain,types}.ts` + `__tests__`. **Must NOT:** the ContentSource write layer, any route/UI.
  - **Oracle:** unit test — from fixture docs (project.yml + ADRs with `Status:` + backlog), the digest includes the locked decisions + open constraints + the READY list, excludes done/draft noise, and stays within the size budget.
  - **Evidence:** spec v2 §3 US-1/US-2 + §6 ADR-0004 · infinite-oneness v6 `renderBrain` Project-Brain precedent · existing `parseBacklog`/`readiness` in `src/lib/tasks`.
  - **Escalate if:** the digest can't stay in budget without dropping decisions → the selection/size policy is a product call (ADR-0004).
- · **G2** Paste door — "Copy context" button + `context.md` export route.  → **[S]**
  - **Intent:** give non-Claude agents (PM's GPT) the digest with zero setup — copy + a `.md` export.
  - **Touches:** `src/components/copy-context.tsx`, `src/app/ops/[project]/context.md/route.ts`, wire into the project view. **Must NOT:** `renderBrain` internals (consume only), the write layer.
  - **Oracle:** E2E — Copy context puts the digest on the clipboard; `GET context.md` returns the same text (single source).
  - **Evidence:** spec v2 §3 US-2 · G1 output · existing `src/app/ops/[project]/page.tsx`.
  - **Escalate if:** clipboard API is blocked in a target browser → fall back to a select-all textarea.
- · **G3** Local MCP server (stdio, read-only) — `list_projects` · `ready_tasks` · `get_project_context` · `get_doc`.  → **[P]**
  - **Intent:** let a local Claude Code session pull READY tasks + the Brain live, grounded without copy-paste.
  - **Touches:** `src/mcp/{server,tools}.ts` (reuse `lib/content`+`lib/tasks`+`lib/brain`), a `mcp` script. **Must NOT:** any mutation/write tool (read-only in v2), the auth layer.
  - **Oracle:** integration test — the four tools resolve; `ready_tasks` returns only DoR-passing tasks; no tool can write to a repo.
  - **Evidence:** spec v2 §3 US-1 + §6 ADR-0006 · architecture.md §10 · `@modelcontextprotocol/sdk`.
  - **Escalate if:** the MCP stdio server conflicts with Next bundling → ship it as a standalone bun entry, not under Next.
- ✎ **G4** Remote MCP (HTTP + token) — the team's shared grounding endpoint. *(DRAFT — trails v4 auth; ground when F5 lands.)*

### v3 · Sync — git-free write-back  *(DRAFT — ground each when the phase begins)*
- ✎ **S1** `ContentSource` gains a write method (`appendTask`/`updateTaskStatus`); in-memory + fs impls.
- ✎ **S2** Local-git write-back (commit on a branch) — the engineer's machine. *(ADR-0002)*
- ✎ **S3** GitHub ContentSource (read) + push-webhook `revalidateTag`. *(ADR-0001 amendment)*
- ✎ **S4** GitHub write-back (open a PR) — the real PM/QA sync path. *(ADR-0002, ADR-0005)*

### v4 · Team & auth  *(DRAFT)*
- ⏸ **F5** real better-auth (email+password) over Neon/Kysely — un-defers `db.ts` (was v1's stop). *(blocked on owner Neon creds — see F5.1 above)*
- ✎ **R1** roles: engineer (full + agent) · PM/QA (task UI + grounding, no agent) · client (read-only).

### v5 · Packaging — open-core  *(DRAFT / stretch)*
- ↷ **P1** extract `@groundwork/engine` (workspace) — the pure core both hosts import.
- ↷ **P2** `@groundwork/cli init` + `groundwork.config.ts` scaffold (self-host).
- ↷ **P3** Cloud tier (metered, your key) — separate product decision; not before real self-hosters.
