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

- [x] **G1** `renderBrain(project) → digest` — pure digest (current state + locked decisions + open constraints + READY tasks) that any agent consumes.  → **[P]**
  - **Intent:** one distilled, size-bounded current-truth digest per project so mixed-agent teammates stop drifting from locked decisions.
  - **Touches:** `src/lib/brain/{render-brain,types}.ts` + `__tests__`. **Must NOT:** the ContentSource write layer, any route/UI.
  - **Oracle:** unit test — from fixture docs (project.yml + ADRs with `Status:` + backlog), the digest includes the locked decisions + open constraints + the READY list, excludes done/draft noise, and stays within the size budget.
  - **Evidence:** spec v2 §3 US-1/US-2 + §6 ADR-0004 · infinite-oneness v6 `renderBrain` Project-Brain precedent · existing `parseBacklog`/`readiness` in `src/lib/tasks`.
  - **Escalate if:** the digest can't stay in budget without dropping decisions → the selection/size policy is a product call (ADR-0004).
- [x] **G2** Paste door — "Copy context" button + `context.md` export route.  → **[S]** *(2026-07-28)*
  - **Intent:** give non-Claude agents (PM's GPT) the digest with zero setup — copy + a `.md` export.
  - **Touches:** `src/components/copy-context.tsx`, `src/app/ops/[project]/context.md/route.ts`, wire into the project view. **Must NOT:** `renderBrain` internals (consume only), the write layer.
  - **Oracle:** E2E — Copy context puts the digest on the clipboard; `GET context.md` returns the same text (single source).
  - **Evidence:** spec v2 §3 US-2 · G1 output · existing `src/app/ops/[project]/page.tsx`.
  - **Escalate if:** clipboard API is blocked in a target browser → fall back to a select-all textarea.
- [x] **G3** Local MCP server (stdio, read-only) — `list_projects` · `ready_tasks` · `get_project_context` · `get_doc`.  → **[P]** *(2026-07-28)*
  - **Intent:** let a local Claude Code session pull READY tasks + the Brain live, grounded without copy-paste.
  - **Touches:** `src/mcp/{server,tools}.ts` (reuse `lib/content`+`lib/tasks`+`lib/brain`), a `mcp` script. **Must NOT:** any mutation/write tool (read-only in v2), the auth layer.
  - **Oracle:** integration test — the four tools resolve; `ready_tasks` returns only DoR-passing tasks; no tool can write to a repo.
  - **Evidence:** spec v2 §3 US-1 + §6 ADR-0006 · architecture.md §10 · `@modelcontextprotocol/sdk`.
  - **Escalate if:** the MCP stdio server conflicts with Next bundling → ship it as a standalone bun entry, not under Next.
- [x] **G4** Remote MCP (HTTP + token) — the team's shared grounding endpoint.  → **[P]** *(2026-07-28)*
  - **Intent:** give teammates on other machines the same live grounding the engineer gets over stdio, without waiting for real auth.
  - **Touches:** `src/mcp/{http,auth}.ts`, `src/app/api/mcp/route.ts`, `env-server` (`MCP_TOKEN`). **Must NOT:** the tool layer's read-only narrowing, the cookie session.
  - **Oracle:** unit tests for the JSON-RPC dispatcher + token gate; E2E — unauthenticated POST is 401, a bearer token lists the four tools, and `tools/call` returns byte-identical text to `context.md`.
  - **Evidence:** spec v2 §4 (G4) · ADR-0006 (transport-agnostic tool layer) · `src/mcp/tools.ts` · G3's stdio server.
  - **Escalate if:** a client needs SSE / session ids — v2 ships the non-streaming half of Streamable HTTP only.

### v3 · Sync — git-free write-back

- [x] **S1** Backlog serializer + the `BacklogWriter` seam.  → **[P]** *(2026-07-28)*
  - **Intent:** let a task captured in the UI land in the repo Markdown that stays the single source of truth.
  - **Touches:** `src/lib/tasks/{serialize,write-back}.ts`, `src/lib/content/write.ts`, `writers/{memory,filesystem}.ts`. **Must NOT:** `ContentSource`'s read interface (kept read-only so MCP stays read-only by type).
  - **Oracle:** unit — `parseBacklog(renderTask(t)) === t` for every status and tier; `setTaskStatus` changes exactly one line; a duplicate id writes nothing.
  - **Evidence:** ADR-0002 · `src/lib/tasks/parse-backlog.ts` (the inverse) · spec v2 US-3/US-4.
  - **Escalate if:** the write seam would have to sit on `ContentSource` — it does not; ADR-0002 records why.
- [x] **S2** Local-git write-back — commit on a `groundwork/*` branch.  → **[P]** *(2026-07-28)* *(ADR-0002)*
  - **Intent:** give the engineer's own machine a real write path without a GitHub token.
  - **Touches:** `src/lib/content/writers/git.ts`, `writers/index.ts` factory. **Must NOT:** commit to the checked-out branch; the read layer.
  - **Oracle:** unit against a fake git runner — branch is created before the file is written, the commit carries a `Requested-by` trailer, a non-repo is refused, a failing command surfaces rather than reporting success.
  - **Evidence:** ADR-0002 (PR-by-default, branch for solo) · `src/lib/content/write.ts` seam.
  - **Escalate if:** the actor is not a valid git ident — resolved: attribution rides as a trailer, not `--author`.
- [x] **S3** GitHub ContentSource (read) + signed push webhook.  → **[P]** *(2026-07-28)* *(ADR-0001 amendment)*
  - **Intent:** let a deployed instance read the team's private repos, since it cannot read anyone's laptop.
  - **Touches:** `src/lib/content/github/**`, `github-source.ts`, `src/app/api/webhooks/github/route.ts`. **Must NOT:** the `ContentSource` interface shape (identical behaviour behind it).
  - **Oracle:** unit — the mock-backed source lists/reads docs and feeds `loadBrain` exactly as the filesystem source does; signature verification rejects wrong secret, tampered body, truncated header.
  - **Evidence:** spec v2 US-5 · `filesystem-source.ts` (the shape to match) · ADR-0001.
  - **Escalate if:** no token exists to test against — resolved: a mock client, labelled as such on /ops/integrations.
- [x] **S4** GitHub write-back — open a PR.  → **[P]** *(2026-07-28)* *(ADR-0002)*
  - **Intent:** the real PM/QA sync path — their change becomes a reviewable PR, not a direct push.
  - **Touches:** `src/lib/content/writers/github-pr.ts`, the REST client's write half. **Must NOT:** commit to the default branch.
  - **Oracle:** unit — branch → commit → PR in order, requester attributed in the body, `pending` true with a link; a failure at any step is reported rather than claimed as success.
  - **Evidence:** ADR-0002 (AI proposes, humans dispose) · spec v2 US-3 · the S1 seam.
  - **Escalate if:** GitHub needs a blob sha to update a file — handled in `putFile`.
- [x] **S5** Task capture + status flip UI (spec US-3/US-4).  → **[S]** *(2026-07-28)*
  - **Intent:** the surface PM/QA actually touch — capture a task, move its status, never see git.
  - **Touches:** `src/components/{task-capture,task-status-control,write-outcome}.tsx`, `src/app/ops/[project]/actions.ts`. **Must NOT:** report a pending write as saved.
  - **Oracle:** E2E — DoR fills in live as fields are typed; submitting reports "Proposed" + names the mock; a duplicate id shows a readable error; a status flip routes through the same path.
  - **Evidence:** spec v2 US-3/US-4 · ADR-0002 (`pending`) · the S1 write path.
  - **Escalate if:** a role without `tasks.write` reaches the action — it is re-checked server-side (R1).

### v4 · Team & auth

- → **F5** Auth seam + signed sessions; **better-auth over Neon still not wired**.  → **[P]** *(2026-07-28)*
  - **Intent:** gate the console per-person and per-role, and stop treating any cookie value as an admin.
  - **Touches:** `src/lib/auth/**`, `src/proxy.ts`, `src/app/sign-in/**`. **Must NOT:** ship unverified DB-backed auth that self-activates on an env var.
  - **Oracle:** unit — a tampered role, a foreign secret, an expired token and garbage all verify to null; E2E — a forged cookie redirects to sign-in.
  - **Evidence:** tech-standards §7 · spec v2 §4 (F5) · `src/lib/auth/session-token.ts`.
  - **Escalate if:** no Neon creds — **hit.** The in-memory adapter fills the seam; `authStatus()` and /ops/integrations report it. **Remaining:** implement the better-auth/Kysely adapter + migration, then set `DATABASE_URL` + `BETTER_AUTH_SECRET`.
- [x] **R1** Roles: engineer · PM/QA · client.  → **[P]** *(2026-07-28)*
  - **Intent:** PM/QA run the board without spending tokens or seeing secrets; a client reads only.
  - **Touches:** `src/lib/auth/roles.ts`, `src/proxy.ts`, ops layout + project page, the write actions. **Must NOT:** rely on hidden UI as the control.
  - **Oracle:** unit — the capability matrix per role; E2E — PM hitting `/triage` and QA hitting `/integrations` are both redirected with `?denied=`, and a client sees no write affordances.
  - **Evidence:** spec v2 §4 (R1) · ADR-0007 (the team pivot) · `src/lib/auth/session-token.ts` (signed role claim).
  - **Escalate if:** roles need to differ per project — they are global today.

### v5 · Packaging — open-core  *(DRAFT / stretch — deliberately not started)*
- ↷ **P1** extract `@groundwork/engine` (workspace) — the pure core both hosts import.
- ↷ **P2** `@groundwork/cli init` + `groundwork.config.ts` scaffold (self-host).
- ↷ **P3** Cloud tier (metered, your key) — separate product decision; not before real self-hosters.

