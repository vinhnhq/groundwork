# Backlog — TDD-ordered, DoR-tagged

> Each leaf: **red → green → refactor → commit**, atomic. A task starts only when it passes the **Definition of Ready** (intent · autonomy tier · Touches/Must-NOT · Oracle · ≥2 evidences · Escalate-if). DRAFT = discuss first.
> Status: ✓ done · → in progress · · ready · ✎ draft (not ready) · ⏸ blocked · ↷ stretch
> Autonomy: **S**upervised · **P**lan-gated · **D**ark · **T**rivial (tech-standards §0/DoR).

Dogfooding note: Groundwork has its OWN `__project__/` docs + (soon) `project.yml`, so it appears as a project in itself — the first end-to-end test of ingest + DoR.

---

## v1 — Foundation (rungs 1–4)

### F0 · Repo scaffold  → **[P]**
- · **F0.1** `create-next-app` (Next 16, TS, App Router, `src/`, Turbopack, Biome) + pin the tech-standards §0 stack (Kysely `^0.28`, better-auth `^1.5`, Zod v4, purify-ts/type-fest/es-toolkit/ts-pattern, Vitest+Playwright, shadcn radix-maia). Wire `package.json` scripts (dev/build/lint/format/migrate/seed/test*). `next.config.ts` (`reactCompiler`, `serverExternalPackages:["ws"]`, CSP static header). `.gitignore`, `.env.example`.
  - **Touches:** repo root, `package.json`, `next.config.ts`, `biome.json`, `src/app/` shell. **Must NOT:** `__project__/**` docs.
  - **Oracle:** `bun run dev` boots; `bun run lint` + `tsc --noEmit` green; `bun run build` succeeds.
  - **Evidence:** tech-standards §0 (stack table) · §6 (Kysely pin/driver) · architecture §11 (layout).
  - **Escalate if:** create-next-app defaults conflict with the pinned versions, or shadcn radix-maia init needs a preset decision beyond `bbVJxYW`.

### F1 · Core lib seam  → **[P]**
- · **F1.1** Lift the `src/lib/` core modules from tech-standards §4: `context.ts` (ALS + React.cache + `readContext` + `withTransaction`), `db.ts`/`db-pool.ts`/`db-types.ts`/`db-url.ts`, `clock.ts`, `env-server.ts`/`env-client.ts`, `exhaustive.ts`, `repository.ts`+`in-memory-repository.ts`, `pipe.ts`, `result.ts`, `utils.ts`, `now.ts`. Unit tests for the pure ones.
  - **Touches:** `src/lib/*.ts`, `src/tests/**`. **Must NOT:** any route/page.
  - **Oracle:** unit tests pass for `result`/`pipe`/`in-memory-repository`/`context` (the 5 context cases); `tsc` green.
  - **Evidence:** tech-standards §4 (module list) · §5 (context rules, ADR-0012).
  - **Escalate if:** ALS-doesn't-propagate probe behaves differently on this Next 16 patch.

### F2 · Content source + frontmatter (rung 1–2)  → **[D]**
- ✎ **F2.1** `project.yml` frontmatter schema (architecture §5) + `src/lib/content/` `ContentSource` iface with a **filesystem** adapter (reads sibling repos via `PROJECT_ROOTS`), `gray-matter` parse. Pure parser unit-tested.
  - *DRAFT — needs:* the final frontmatter field list confirmed (Oracle: a fixture repo parses to the typed `Project`; Evidence: architecture §5 + §4-ContentSource). **→ promote to [D] once the schema is locked.**
- ✎ **F2.2** Markdown → RSC renderer (`react-markdown` + remark/rehype, client-side mermaid). *DRAFT — Oracle/evidence TBD.*

### F3 · Task model + DoR deriver (rung 3 core)  → **[D]**
- · **F3.1** Parse `backlog.md` leaves → `Task[]` (architecture §6 shape) + a **pure `isReady(task): boolean`** deriver (intent+autonomy+touches+oracle+`evidence.length>=2`+escalateIf). Exhaustive unit tests incl. the DRAFT-missing-fields path.
  - **Touches:** `src/lib/tasks/**`, `src/tests/**`. **Must NOT:** UI, DB.
  - **Oracle:** unit tests: a fully-specced task → READY; each missing field → NOT ready + names the gap; ≥90% branch coverage on the deriver.
  - **Evidence:** architecture §6 (Task+DoR model) · tech-standards §3 (tagged-union outcomes).
  - **Escalate if:** the backlog Markdown shape is too irregular to parse deterministically → propose a stricter task-line grammar first.

### F4 · Ops UI (rung 3 UI)  → **[P]**
- · **F4.1** `/ops` home: project list (name/status/tagline/stack) + a cross-project **READY queue** + a separate DRAFT list naming missing DoR fields. Mobile-first, both themes, skeleton `loading.tsx`.
  - **Oracle:** Playwright: with 2 fixture repos, the home lists both, the READY queue shows only ready tasks, an unconfigured repo shows "unconfigured" not a crash. Lighthouse A11y ≥95.
  - **Evidence:** spec v1 stories 1+3 · tech-standards §13 (loading/UI).
- · **F4.2** `/ops/[project]` doc pages (ADR/spec/retro rendered; relative images resolve).
  - **Oracle:** Playwright: open an ADR, a mermaid block renders, a relative image displays.
  - **Evidence:** spec v1 story 2.

### F5 · Auth gate (rung 4)  → **[P]**
- · **F5.1** better-auth (email+password, single admin) over Kysely/Neon; migration for the auth tables (integer `users.id` override per tech-standards §7); `src/proxy.ts` gates `/ops/**`; `/` public; the `NODE_ENV`-gated dev-session E2E seam.
  - **Oracle:** integration test (session lookup) + Playwright: signed-out `/ops` → redirect to sign-in; signed-in → ops home.
  - **Evidence:** tech-standards §7 (better-auth schema + integer-id footgun) · spec v1 story 4.
  - **Escalate if:** `@better-auth/kysely-adapter` needs a Kysely version other than the pinned `^0.28`.

### F6 · Dogfood + docs  → **[T]**
- · **F6.1** Add Groundwork's own `project.yml`; confirm it appears in its own ops list. Write ADR-0001 (ContentSource: fs-first). Update architecture status; move done tasks to `done.md`.

---

## Later versions (not yet specced)
- **v2** — Public portfolio projection (rung 5) · asset tiers + object storage (rung 6).
- **v3** — Client-idea triage agent + write-back (rung 7); write ADR-0003 (DoR/evidence rule), ADR-0005 (triage authority = AI-proposes/humans-dispose).
- **v4** — MCP server (rung 8): `ready_tasks` across all projects the headline tool.
