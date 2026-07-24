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

## Later versions (not yet specced)
- **v2** — Public portfolio projection (rung 5) · asset tiers + object storage (rung 6).
- **v3** — Client-idea triage agent + write-back (rung 7); write ADR-0003 (DoR/evidence rule), ADR-0005 (triage authority = AI-proposes/humans-dispose).
- **v4** — MCP server (rung 8): `ready_tasks` across all projects the headline tool.
