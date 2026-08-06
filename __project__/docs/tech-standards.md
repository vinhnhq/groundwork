---
id: gw-doc-tech-standards
kind: doc
title: Technical standards & playbook
description: The engineering DNA lifted from infinite-oneness: FP playbook, context rules, DB/auth/ES patterns, testing, UI.
status: active
updated: 2026-08-06
---

# Groundwork — Technical Standards & Reusable Playbook

> **What this is.** The business-stripped technical DNA of `infinite-oneness`, distilled for reuse in Groundwork
> (and any future Next.js/TS/Postgres project). Every DAO/funding/oneness/debate/aggregate domain rule has been
> removed; what remains is stack, architecture, conventions, hard-won gotchas, and engineering practice.
> Provenance is preserved as `ADR-NNNN` / `memory-slug` / `vN retro` tags so any rule traces back to source.
>
> **How to use.** Read §0 (kickoff decisions) first — a few things `infinite-oneness` itself was inconsistent on,
> resolved here with a recommendation. Then §1–§5 are the always-on rules; §6–§13 are reach-for-when-building
> references; §14 is the gotcha catalog (skim once, grep later).

---

## 0. Kickoff decisions to lock (resolve these on day one)

`infinite-oneness` evolved, so its docs disagree in a few places. For Groundwork, pick once and state it:

| Decision | infinite-oneness had… | **Recommended for Groundwork** |
|---|---|---|
| **Stack version** | `dev-workflow.md` says Next 15/React 19; as-built is Next 16/React 19 | **Next 16 + React 19 + React Compiler + TS 6 + Bun** (as-built) |
| **Test runner** | `dev-workflow.md` mentions Bun's built-in `bun test`; as-built is Vitest projects | **Vitest** (`unit` + `integration` projects). `bun test` is a footgun — it runs Bun's own runner and finds zero files. |
| **Test location** | `__tests__/` next to source (workflow) vs `src/tests/{unit,integration}` (as-built) | Pick one; **`src/tests/{unit,integration}` + co-located `*.test.ts`** matched the Vitest project config cleanly. |
| **shadcn customization** | ADR-0011 says "edit `ui/*` in place"; as-built src layout says "`ui/*` pristine, wrap in `components/*`" | **Wrapper-over-pristine** — keep `ui/*` byte-identical to `shadcn add`, put tweaks/variants in `components/<name>.tsx`. Upgrades diff cleanly. (State it once and never mix.) |
| **shadcn style** | stale `design.md` stub says `radix-mira`/`mist`/`hugeicons` | **`radix-maia` · baseColor `neutral` · Inter · lucide · preset `bbVJxYW`** (authoritative, ADR-0011 §A11). |
| **Result/Either** | homemade `Result<E,A>` → purify-ts graduation | Keep the ladder: homemade `Result` for sync, graduate to `purify-ts` `Either`/`EitherAsync` at ≥3 chained fallible steps. |

---

## 1. Engineering principles (every task)

- **Think before coding.** State assumptions; if multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, push back. If unclear, stop and name it.
- **Simplicity first.** Minimum code that solves the problem. No speculative features, no single-use abstractions, no unrequested "flexibility," no error handling for impossible states. If 200 lines could be 50, rewrite. Test: "would a senior engineer call this overcomplicated?"
- **Surgical changes.** Touch only what you must. Don't "improve" adjacent code/formatting, don't refactor what isn't broken, match existing style. Notice unrelated dead code → mention it, don't delete it. Every changed line traces to the request.
- **Goal-driven execution.** Turn tasks into verifiable goals: "add validation" → "write tests for invalid inputs, then make them pass." Strong success criteria let an agent loop run unattended.
- **Spec before code.** Outcome-only prompts ("add login," "make it faster") → ask which files/signatures/shapes first. AI-generated code passes the same review bar as hand-written (factoring, tests, conventions, PR size). Work in thin slices: one task → test → commit → next. Never batch a sprint and review a wall of diffs at the end.
- **The calibration test (the North Star).** Match the abstraction to the actual constraint. Reach for a tool only when you can name the concrete pain it removes in **≥3 places**. "Elegant" alone is a yellow flag. When uncertain, bias to the **more concrete** option — abstraction is far easier to add than remove. Decide **per-module, not per-codebase**.

---

## 2. Process — six phases + task tracking

```
SPEC → PLAN → BUILD → TEST → REVIEW → RELEASE
```

1. **Spec** — Goal · Out of scope · User stories + acceptance criteria · Non-functional · Open questions. Can't write the spec → the request isn't ready.
2. **Plan** — TDD-ordered tasks, each **red → green → refactor → commit**, one-commit-sized.
3. **Build** — one task at a time, vertical slices, failing test first.
4. **Test** — all gates green (test, lint, typecheck) before a task moves to done.
5. **Review** — five axes: correctness, readability, architecture, security, performance. Solo → review your own diff before the release PR.
6. **Release** — PR-based, never auto-merge; the merge is a deliberate human click.

**Skip the full protocol** for trivial changes (typo/config/dep-bump: just lint+typecheck+push) and throwaway spikes (mark as such, one `notes.md`, promote only when it graduates).

**Task tracking:** `spec.md` + `backlog.md` (TDD-ordered) + `done.md` (archive, newest at top: `- 2026-05-08 · abc1234 · 1.2 short desc`). Promote to a richer `docs/` + `decisions/` + `specs/vN.md` layout only when >1 version is in flight, a structural decision needs an ADR, or domain rules need a >30-line reference. Resist pre-building structure.

**Docs layout (`__project__/`):**
```
__project__/
├── docs/{architecture.md, design.md, retro.md, decisions/NNNN-<slug>.md}
├── specs/v<N>-<slug>.md
├── tasks/{backlog.md, done.md}
└── reference/            ← read-only inputs
```

---

## 3. FP playbook (seven principles)

1. **APIs describe intent, not entities.** `POST /orders/:id/cancel`, not `PUT /orders/:id`. Same for Redux actions, server actions, RPC, event names — model the verb the user invoked.
2. **Make illegal states unrepresentable.** Tagged unions; each variant carries only its valid data. Replace `{loading, error, data}` (8 combos, 3 valid) with `{tag:'loading'} | {tag:'success',data} | {tag:'failure',error}`. Consume with `ts-pattern` `.exhaustive()`.
3. **Pure core, imperative shell.** Business logic = pure functions taking primitives + ADTs, returning ADTs. I/O (DB, fetch, auth, time, randomness, env) lives in a thin edge layer. Route handlers/server actions contain **no business rules**. Pure core tests need no mocks/fixtures/setup. Time & randomness flow as params (`now: number`, `rng: () => number`) — never `Date.now()` inside a deriver.
4. **Branded types — parse, don't validate.** Validate once at the boundary; the type proves validity onward. `Tagged<string,'Email'>` (type-fest, compile-time) or `zod.brand()` (runtime-backed). `as unknown as X` is forbidden outside boundary constructors.
5. **Typed errors via Result/Either.** `throw` for programmer defects only; expected failures are tagged-union values. Homemade `Result<E,A>` for sync; graduate to `purify-ts` `Either`/`EitherAsync` at ≥3 sequential dependent steps.
6. **Pipe + small named unary transforms.** Each step `(input: T) => U`, composed with `pipe` (es-toolkit ships `flow`, not `pipe` — hand-roll typed overloads). Read top-down.
7. **State machines for multi-step flows.** Tagged-union state + pure reducer `(state, event) => state`. Graduate to XState only for complex orchestration (parallel branches, history, transition side effects).

**Decision-rule calibration:**

| Situation | Use |
|---|---|
| 1–2 failure modes, no chaining | `?.` `??` / plain throw |
| 3+ failure modes in one fn | `Result<E,A>` |
| 3+ sequential dependent fallible steps | `Either`/`EitherAsync` (purify-ts) |
| DI + structured concurrency + typed retries | Effect-TS |
| Async data in UI | TanStack Query |
| Form validation | react-hook-form + Zod v4 (`standardSchemaResolver`) |
| State machine <8 states / complex | tagged union+reducer / XState |
| Pattern matching | `ts-pattern` |
| Branded (compile / runtime) | type-fest `Tagged` / `zod.brand()` |
| Utilities | `es-toolkit` (never lodash) |
| HTTP | native `fetch` (Next caching) |
| Date/time | `date-fns` / `Temporal` |
| Request-scoped deps | `AsyncLocalStorage` (never global import) |
| Event-sourced audit | Decider (decide+evolve+getInit) |

**Forbidden → replacement:** `lodash`→es-toolkit · `axios`→fetch (axios breaks Next caching) · `moment`→date-fns · `enum`→string-literal unions/`as const` · `fp-ts`→Effect-TS if truly needed · `class` for entities→types+functions · `any`→`unknown`+narrowing · `import {db}`→context · raw `number` money→branded integer.

---

## 4. fDDD architecture (per domain operation)

**Layer stack (request → data):**
```
Route handler (app/api/.../route.ts | server action)
  parse request → domain types · runWithContext({db,user,requestId}, …)
  call controller · map outcome → HTTP via match().exhaustive()   ← no logic
        ↓
Controller (lib/domain/<entity>/operations/<verb-noun>/controller.ts)
  partial-applied with repos/services (closure DI) · reads context
  load entities → call deriver → branch on outcome → do I/O
  wrap multi-write units in withTransaction()                      ← no decisions
        ↓
Deriver (pure) — entities + primitives → discriminated-union outcome
  no I/O · no Date.now() · no context                              ← all business logic
        ↓
Repository (lib/domain/<entity>/repository.ts)
  reads db from context (never `import {db}`) · parses rows → domain types
  two impls: createInMemoryXxxRepo (tests) + dbXxxRepo (prod)
        ↓
Drivers: db.ts (HTTP, reads+simple writes) · db-pool.ts (WS, tx, "server-only")
```

- **Entities** — types + zod parsers; branded ids/primitives; `parseX(raw:unknown): Result<ParseError,X>`.
- **Invariants** — pure predicates, one rule each, named as questions (`isPublishable`, `canPledge`).
- **Co-locate per operation:** `operations/<verb-noun>/` holds `deriver.ts`, `invariants.ts`, `controller.ts`, `types.ts`, `*.test.ts`. Start flat (`entity.ts`+`repository.ts`); add `operations/` at ≥2 ops or ≥3 noisy invariants. Keep `repository.ts` co-located with the entity, not in a separate `infrastructure/`.
- **Non-domain homes:** pure primitives `lib/*.ts` · external services `lib/services/<svc>.ts` (flat, factory-shaped, one file each) · DB seam `lib/{db,db-pool,db-types,context}.ts` · migrations+seed `src/db/`.

**Reusable `src/lib/` core modules to lift:** `context.ts` (ALS + React.cache seam), `db.ts`/`db-pool.ts`/`db-types.ts`/`db-url.ts` (CLI-safe env read), `auth.ts`/`auth-client.ts`, `clock.ts` (Clock seam), `env-server.ts`/`env-client.ts` (zod-validated), `exhaustive.ts` (`assertNever`), `repository.ts`+`in-memory-repository.ts` (generic), `pipe.ts`, `result.ts`, `utils.ts` (`cn`), `now.ts` (`getNow = cache(() => new Date())`), `services/` (interface + stub + real, `select*Provider(env?)` factory).

**The Refactor Algorithm (per subsystem, one at a time — never the whole repo):** (1) name business intent, verb-first; (2) extract entities + branded ids; (3) extract invariants; (4) build pure derivers; (5) build partial-applied controllers; (6) build repos (in-memory first); (7) replace `if(result.ok)` ladders (3+ → `.chain`); (8) wire thin route handler; (9) wrap atomic writes in `withTransaction`; (10) **stop — document where you stopped and why** (the decision log outvalues the diff).

---

## 5. Request-scoped context (ADR-0012 — the load-bearing one)

Anything varying per request (db connection, user, requestId, trace, tenant) — never `import {db}` directly. **Two mechanisms, one shape:**

- **`React.cache()` for the RSC tree** — `getRequestContext = cache(async () => buildContext())`. Same object per render, fresh per request.
- **`AsyncLocalStorage` at route-handler + server-action + cron boundaries** — `runWithContext(ctx, fn)` (ALS instance `storage`); sync `getContext()` throws-if-missing.
- **Repositories read via one `readContext()` adapter** = `storage.getStore() ?? getRequestContext()`.
- **`withTransaction(fn)` swaps db ambiently** — re-enters `runWithContext({...parent, db:trx}, fn)`; **no `ctx`/`txCtx` threaded**.

**The footguns (proven by probe):**
- **ALS does NOT propagate into Suspense/parallel RSC children** — the JSX tree is returned as data and rendered later from Next's own async context; the ALS frame has popped. Use `React.cache()` there, ALS only where you own the call site.
- **Never read request context inside `unstable_cache` / `'use cache'` / `fetch(…{next})` / route-segment `revalidate` / `generateStaticParams`/`generateMetadata`** — output persists to the cross-request Data Cache; a context read leaks across requests/edge nodes. Cache fns must be **pure over their args**; request-scoped values enter via the **cache key**, never the body. Grep-check that `getStore()`/`getRequestContext()` never appear inside `unstable_cache(...)`.
- **Pure code never reads context** — derivers/invariants/utilities take every dependency as explicit params. Only repositories, service adapters, controllers, route handlers may read context. `after()` background work needs a fresh `runWithContext` (render scope is torn down).

---

## 6. Database layer (ADR-0002)

- **Kysely over Drizzle** — hand-maintained `Kysely<DB>` interface, portable SQL, repository contains the choice. **Pin Kysely `^0.28`** (`@better-auth/kysely-adapter` breaks on 0.29). Note: 0.29 moved `Migrator`/`FileMigrationProvider` to the `kysely/migration` subpath.
- **Neon dual driver:** HTTP (`@neondatabase/serverless` `neon()`) for reads + simple writes; WS (`Pool`+`ws`) for transactions. `serverExternalPackages: ["ws"]` required in `next.config.ts`. Pool default `max:20,min:2,idleTimeoutMillis:30000`.
- **Driver-selection rule:** single insert/select/update → HTTP `db`; cross-table atomic writes → `withTransaction()`; 2–3 atomic inserts, no isolation need → SQL CTE through HTTP.
- **Migrations:** Kysely `Migrator` + `FileMigrationProvider`, TS modules `NNN-<slug>.ts` (zero-padded, reversible `up`/`down`, one concern). `bun run migrate` idempotent. Hand-maintain `db-types.ts` per migration (integration tests catch drift). **Guard mutating commands against `NODE_ENV=production`** (require `--allow-prod`) and print target host/db.
- **Repository pattern:** generic `Repository<T,Id>` (`getById`/`getMatching`/`create`/`update`/`delete` + `upsert`/`save` when the caller mints the id); two impls per entity.
- **Neon branch convention:** `main`→prod (`DATABASE_URL` on Vercel) · `dev`→local (`.env.local`) · `test`→integration (`DATABASE_TEST_URL`). Neon Auth disabled (using better-auth). `.env.local` gitignored; bootstrap `cp .env.example .env.local`.

---

## 7. Auth (better-auth, basic)

> **Groundwork diverges here — see ADR-0008 (2026-07-29).** This section is the
> `infinite-oneness` playbook; three of its rules did **not** survive contact with what
> Groundwork actually needs, and following them now would be wrong:
>
> 1. **Sign-in is by username, not email.** The `username` plugin, `minUsernameLength: 2`
>    (the role names are the usernames and two of them are two characters).
> 2. **No integer `users.id` override.** better-auth's `text` ids are kept as-is. There is
>    no `UserId` brand and no `Number(...)` at callsites — the footgun below does not exist
>    here because the workaround that creates it was not adopted.
> 3. **No dev-bypass `setSession` route.** The E2E suite signs in through the real form
>    against a seeded database (`docker compose up -d && bun run migrate && bun run seed`),
>    so there is no production-gated seam to defend. Table names are better-auth's defaults
>    (`user`, `session`, `account`, `verification`), not the prefixed ones below.
>
> Also Groundwork-specific: the edge proxy is a **fast path**, not the authority — it reads
> a five-minute signed cookie cache, and a miss falls through to `requireCapability`, which
> checks the database. Any role-gated page that skips that call is ungated for five minutes
> at a time.

- **better-auth `^1.5` + `@better-auth/kysely-adapter` + `better-auth/next-js` (`nextCookies()`).** DB-backed sessions (opaque cookie → `getSession()` lookup, wrapped in `React.cache`).
- **Schema:** `users` + `better_auth_sessions`/`better_auth_accounts`/`verification` (`id text` PK/UUID; `accounts` keeps an unused `password` column for the contract).
- **Integer `users.id` override:** better-auth defaults user PK to UUID → `generateId: ({model}) => model==='user' ? false : crypto.randomUUID()` so Postgres SERIAL assigns it. **Footgun:** every callsite returns `session.user.id` as a *string* — `Number(...)` it everywhere. Brand at the boundary: `UserId = Tagged<number,'UserId'>` via `parseUserId → Result`.
- **better-auth is the accepted exception to no-`import{db}`** (needs the connection at construction).
- **Dev-bypass (the one accepted E2E seam):** a `setSession(userId)` route that **throws when `NODE_ENV==='production'`**, gated at both route + function (defense in depth), `noindex` on `/test/*`. `signOut` calls your own `clearSession()` (DELETE row + clear cookie).

---

## 8. Event sourcing / CQRS / concurrency (ADR-0007, ADR-0019)

**Adopt only where earned.** Calibration: **≥3 distinct state transitions AND audit/replay matters.** If "what changed?" is one column + a timestamp → plain `operations/<verb-noun>/` (deriver+controller, no events). Test: "would I prove a sequence of changes to a regulator?"

- **Decider triple (all pure, tagged-union state, ts-pattern exhaustive):** `decide(command,state,clock) → Event[]` · `evolve(state,event) → state` · `getInit() → state`. `decide` returns `[]` for idempotent no-ops. **The event is the entity** — derive totals from history, never mutate a running column.
- **Events + same-tx projection (CQRS-lite):** append to a shared `events` table AND upsert a denormalized per-aggregate cache row, **both in one `withTransaction`** (no projection lag). Drift check = `events.reduce(evolve, getInit())` vs cache.
- **`events` schema:** `id uuid, aggregateType text, aggregateId text (stringify heterogeneous ids), sequenceNo int, eventType, eventData jsonb, createdAt, prevHash, hash` + `UNIQUE(aggregateType,aggregateId,sequenceNo)`.
- **Proof Layer = hash chain** (a *property* of the events table, not a separate type): `hash = sha256(prevHash || canonical_json(eventData))`, per-aggregate 1→N. Tamper-**evident**, not tamper-proof against a DB operator.
- **Aggregate = consistency boundary.** One Decider per aggregate, atomic inside, eventual across. **Never a `withTransaction` spanning two Deciders.**
- **Concurrency — one principle:** a uniqueness/ordering invariant can only be enforced at a **single serialization point** (a single Postgres primary qualifies), never in app memory or on a read replica. **OCC:** `load → decide → append-at-expected-version`; the `UNIQUE(aggregateId,sequenceNo)` index is the arbiter; loser re-loads → re-decides → bounded retry (~3). We deliberately do NOT do sharding/actors/Kafka/async projections until a single aggregate is a measured write hotspot.
- **Redux Rosetta:** `evolve` *is* a reducer; a Decider ≈ a slice; events table ≈ a durable action log; the cron reactor ≈ redux-saga. Breaks where: command (rejectable) ≠ event (immutable fact); N instances/type each its own tx boundary.
- **`eventStore`** = generic append-only interface + `dbEventStore` + `createInMemoryEventStore()`. Provide a context-free `createDbEventStoreOn(db)` for scripts (`"server-only"` poisons the chain outside Next).
- **Forbidden:** mutating a status column without an event; reading `events` to render UI (read the cache); `clock`/`Date.now()` inside `decide`/`evolve` (time is a param); calling the store outside a tx; storing derived data in events.

---

## 9. Async work — cron-poll worker (ADR-0004)

Skip a queue dependency; use a **status column as the queue**. Vercel Cron → `/api/internal/<worker>` on a schedule; worker claims rows with **`SELECT … FOR UPDATE SKIP LOCKED LIMIT N`** in one `withTransaction`, processes, commits. Row locks make concurrent firings claim disjoint rows; a crash releases the lock → next run re-claims. **Idempotency:** the decider returns `[]` for a no-op, so re-processing is safe. **Gating:** `X-Cron-Secret` header vs `env().CRON_SECRET` → 401. **Budget:** `LIMIT 5–10` to stay under ~30s. **Graduate to a real queue** (Inngest/QStash/BullMQ) only when: backlog never drains · scheduled-future jobs · fan-out · provider backpressure. **Forbidden:** external API calls in the user-facing route (return 202, let the worker do it); retry counts on the aggregate row (status alone drives it).

**Cross-aggregate reaction discipline:** react to a committed event → issue a command to another aggregate, each hop its own idempotent `withTransaction`. Inline best-effort write = fast path; a `WHERE marker IS NULL` worker scan = correctness path; idempotency by a natural key. A controller calling another controller must propagate tx mode via an injectable `withinTransaction` (pass-through inside the worker's locked tx). **Outbox-lite:** a durable marker column (`executedAt IS NULL`) committed with the source event *is* the outbox row, drained by the idempotent worker.

---

## 10. i18n — co-located message modules (ADR-0025)

Co-located `messages.ts` per feature folder exporting `{ en, vi } as const` (both locales side-by-side so drift is visible in review). No central monolith, no per-file local object. Consumed via `useT(messages)` (client) / `getT(messages, locale)` (RSC) — component passes its own module; **a missing key or missing `vi` translation is a `tsc` error** (a shared type helper enforces `vi` structurally matches `en`). Cookie is the runtime source of truth; `users.language` seeds it on login; a `setLocale` action writes both. Pure/domain code never imports `messages` (i18n is presentation); money/date formatting stays in locale-aware utils.

---

## 11. TypeScript rules

- **Default `unknown`, never `any`** at HTTP/DB boundaries, `JSON.parse`, zod input. `never` for exhaustiveness (`assertNever` in the `default` branch). `void` = callable-discardable, `never` = non-returning.
- **`object`/`Record<string,unknown>`, not `Object`/`{}`.** Literal types + `as const` replace `enum`. Branded types simulate nominal typing — lock construction, ban casts elsewhere. `keyof typeof` + `as const` for "valid key?".
- **`as unknown as X` is a code smell** — every instance needs a review justification. Pick one of `null`/`undefined` (default `undefined`) and ban the other.
- **type-fest worth knowing:** `Tagged`, `Simplify`, `SetRequired`, `SetOptional`, `JsonValue`, `LiteralUnion`.
- **Biome `noRestrictedImports`** enforces the pure boundary — ban `react`, `next/*`, DOM globals, `fetch`, `Date.now()` from `src/lib/**`.

**Anti-patterns to root out:** CRUD endpoints for business operations · scattered `if(result.ok)` ladders (3+ → chain) · Effect-TS without named pain · optional-field proliferation (→ tagged union) · throwing for expected outcomes · business rules in route handlers · `Promise<void>` from domain fns (return outcomes) · mutating args · `let`/`var`/`for`/`while` in domain code (prefer `.map`/`.reduce`/`flatMap`) · `instanceof Error` branching · `class` entities · reading ALS in derivers · threading `db`/`user` through 4+ args · `as unknown as X` outside boundary constructors.

---

## 12. Testing

| Layer | Tool | Where |
|---|---|---|
| Unit / property (pure core) | Vitest `unit` | co-located `*.test.ts` |
| Integration (controllers on in-memory repos; DB against Neon `test` branch, run sequentially) | Vitest `integration` | co-located |
| E2E smoke | Playwright | `e2e/` |

- Commands: `bun run test` (all) · `test:unit` · `test:integration` · `test:e2e` · **`test:coverage` = the real gate (both projects)** · `test:watch`. **Never `bun test`** (Bun's runner, finds nothing).
- Unit tests need no mocks/fixtures/setup. Gates before done: test + lint (`biome check .`) + typecheck (`tsc --noEmit`) green. Targets: pure-logic coverage ≥90%; one Playwright smoke per flow; Lighthouse Perf ≥90 / A11y ≥95.
- **E2E drives the UI like a real user** — `page` only, no `request.*` cheats, assert on rendered DOM. The one bypass = the `NODE_ENV`-gated auth seam. Before adding any `/test/*` route: is the real flow impossible in headless CI? If no, don't add it.
- **Coverage carve-outs** (Next boundary code, covered by Playwright instead): `auth.ts` (`next/headers`), `auth-client.ts` (`"use client"`), `require-user.ts` (`redirect()`), `utils.ts` (`cn`). Scope coverage `include` to `src/lib/**`.
- **Hermetic integration tests** = rolled-back transaction (`dbPool.transaction().execute(… throw '__rollback__')`) — clean DB, no teardown.
- **Generate demo/test data THROUGH the backend** (command round-trip), not static fixtures — the single highest-leverage test.
- **Verify live, don't eyeball** — measure DOM rects (`getBoundingClientRect`/Playwright) for "does it match"; read the log to pin a bug, don't guess. Build a tiny diagnostic probe before an ADR about runtime behavior; delete the probe, keep the recipe in the ADR.
- **E2E infra checklist:** own dedicated port + `reuseExistingServer:false` (else it silently tests the dev DB) · resolve seeded ids via `process.env.*` · `import.meta` unsupported in the Playwright CJS spec loader (resolve from `process.cwd()`, statically import seeds) · `NODE_ENV=test` skips `.env.local` → forward every secret in `webServer.env` · clear a stale `.next/dev/lock` · `{exact:true}` when a label prefixes another.

---

## 13. React 19 / UI / design system

**React 19 patterns:**
- **Forms = `useActionState` + `useFormStatus`** (no manual `useState`+`useEffect`+`fetch`). Server actions in `<feature>/actions.ts` (`"use server"`), `(prev, formData) => next`, inside: getSession → `runWithContext` → controller → `match(outcome).exhaustive()` → `revalidatePath`. `"use server"` files export async fns only — **initial-state constants live in the client component**.
- **Outcome rendering = `ts-pattern` `.match().with(...).exhaustive()`** — the exhaustiveness check is the contract.
- **Pending UI: spinning `Loader2` + disabled + `aria-busy`, keep the visible label** (text-swap jumps width) — but **announce to a11y** via `aria-live`/`sr-only`. Live cross-client updates via a `sonner` toast (its `aria-live` doubles as the SR announcement).
- **Server components doing async work get a sibling `loading.tsx`** skeleton mirroring the eventual layout (`bg-muted` + `animate-pulse`), covering the whole surface. No blank screens, no "Loading…" text.
- **Default to one mobile-first `<feature>.tsx`; split to `<feature>.md.tsx` only when desktop structurally diverges.** Both render SSR via a CSS-swap router (`hidden md:block`).
- **Hover must never carry meaning** (app is mobile+web) — persistent affordances (like the theme toggle), destructive actions red.
- **Transitions:** React 19 `<ViewTransition>` + `addTransitionType()` for screen/state; `<Activity mode="hidden">` preserves state across nav without re-mount; `prefers-reduced-motion` shortens to ~50ms but keeps motion that conveys correctness (transform-only snaps).

**Route-segment tabs + intercepting routes (modal-on-desktop, page-elsewhere):** nav tabs → route-segment folders under the parent layout, tab bar in `layout.tsx`, `usePathname()` active state via `<Tabs><TabsTrigger asChild><Link/>`. Child actions modal-on-desktop-but-page-on-refresh → pair a full `edit/page.tsx` with an intercepting `@modal/(.)edit/page.tsx`; Dialog `onOpenChange(false) → router.back()`; responsive `max-md:!inset-0 max-md:!h-svh` flattens to full-screen. **Form-reuse rule:** the form stays presentational with `onSuccess`/`onCancel` callbacks; full-page uses `router.push` defaults, the Dialog overrides with `router.back()`.

**shadcn + design system:**
- Config: **`radix-maia` · `neutral` · Inter · lucide · preset `bbVJxYW`**. Install via `bunx shadcn@latest add` (not npx). **maia requires** `@import "shadcn/tailwind.css"` in `globals.css` + an app-level `<TooltipProvider>` in the root layout (missing → SSR-500 on any tooltip; gates miss it, smoke the app). Migrate from a visible preset, not `init --preset` (orphans `--success`).
- **Wrapper-over-pristine** (the chosen strategy): `ui/*` byte-identical to `shadcn add`; project touches/variants in `components/<name>.tsx`; consumers import wrappers. Bake a11y + 44px touch targets (`max-md:h-11`) into the wrapper default, not per caller.
- **Tokens:** radius `0.625rem`; **type scale = Tailwind defaults** ("font 16" = `text-base`); `neutral` base + Tailwind palette for semantic color; reach for a fixed `bg-emerald-500` over inventing a `--success` token unless the value varies by mode/theme. Numeric chips `tabular-nums`. Theme via `next-themes` (style both themes).
- **Motion:** Framer Motion for components; native `<ViewTransition>` for routes; `tw-animate-css` in `globals.css`; prefer transform/opacity-only. Co-locate feature CSS (`*.module.css`); `globals.css` for app-wide only.
- **shadcn gotchas** (see §14 for the full list): `size-N` on the SVG not the parent; `gap-0!` to beat `:has()` variants; brand icons via `@icons-pack/react-simple-icons`; standalone page buttons `variant="secondary"`; static ItemGroup rows `gap-0`, interactive rows keep padding.
- **Port the token set whole, or the components fail silently** (ADR-0009, 2026-07-29). Groundwork
  copied the radix-maia primitives but only *part* of `globals.css`: the eight `--sidebar-*` tokens
  `ui/sidebar.tsx` uses 92 times were never defined, and `tw-animate-css` — mandated one line above —
  was never installed, so every overlay mounted with no transition. **A class that resolves to
  nothing is invisible to lint, tsc, unit tests and E2E.** After porting primitives, diff
  `globals.css` against the source repo and check a token's *computed* value on a painted element.

---

## 14. Gotcha catalog (skim once, grep later)

### Build tooling / runtime / scripts
- **`import.meta.dir` is Bun-only** — `tsc`/`next build` reject it; use `join(dirname(fileURLToPath(import.meta.url)), "..")` or `process.cwd()`. (reference-import-meta-dir-bun-only)
- **es-toolkit exports `flow`, not `pipe`** — hand-roll typed `pipe`.
- **ES2017 target forbids BigInt literals (`0n`)** — use `BigInt(0)`, don't bump target.
- **`"server-only"` poisons every import chain** — split context-free "core" modules so scripts/seeds import them outside Next.
- **Never batch-edit non-ASCII files with `perl -pi`/`sed`** — double-encodes; use editor tools, recover via `git checkout`.
- **Biome 2 forbids assignment-in-expression** (`while ((m = re.exec()))`) — use `for (const m of src.matchAll(...))`.
- **Shell `$(grep …)` env override keeps surrounding quotes** — strip them (`sed -E "s/^['\"]|['\"]$//g"`); Bun's `.env` loader strips automatically, shell substitution doesn't.

### Postgres / Kysely / migrations
- **Kysely migrator enforces strict alphabetical order** — applied migrations must be a contiguous prefix; inserting "in the middle" throws `corrupted migrations`. Always append highest; reset the tracking table only in dev/test. (reference-kysely-migration-ordering)
- **`migrate status` lies** (matches by name, skips the corruption guard) — query the migration table / `\dt` directly.
- **Kysely advisory locks don't work over the Neon HTTP driver** (session-scoped, fresh session per call) — parallel `migrateToLatest()` races → `pg_type_typname_nsp_index` dup. Fix: `fileParallelism:false` for integration, or migrate once in `globalSetup`.
- **A JS array bound to `jsonb` must be `JSON.stringify`'d first** — node-postgres serializes a bare array as a PG array literal. Objects are auto-stringified. (reference-jsonb-array-stringify)
- **Numeric column type must mirror runtime type** — 0–1 floats in an `integer` column throw at runtime; use `real`/`double precision`.
- **Prefer additive `ALTER` over editing a shipped migration** (editing diverges branches from the record). **Match the column-identifier convention** (quoted camelCase vs snake_case) on every new column. **A stricter parser shipped ahead of its migration = a hard 500** — migrate-before-deploy is load-bearing.

### Next.js rendering / context
- **Reading `cookies()`/`headers()` makes a page dynamic automatically** (`force-dynamic` redundant). But **Kysely reads do NOT auto-trigger dynamic** — a cookie-less DB-backed page needing per-request freshness must call `connection()`.
- **`router.refresh()` re-suspends an inline `<Suspense>`** whose async child re-runs → subtree unmounts/remounts, losing scroll + state (`startTransition` doesn't save it). For live updates, fetch via a server action and merge into a client store in place.
- **`getByText().waitFor()` throws "context destroyed" during `router.refresh()`** — assert post-settle with `toHaveText`/screenshot.
- **`@`-prefixed App-Router folders are parallel-route slots, not path segments** — `/@handle` needs a rewrite; prefer `/u/{name}`.

### Serverless / Vercel / CSP
- **Bare `void asyncSideEffect()` after response is dropped on serverless** — the function freezes on return. Use `after()` from `next/server` for post-commit Pusher/notify/webhook writes. (reference-vercel-after-fire-and-forget)
- **CSP `connect-src` must include `https://vercel.com` AND `https://*.public.blob.vercel-storage.com`** for `@vercel/blob/client` `upload()` (token-exchange + PUT use connect-src, not img-src). (reference-csp-vercel-blob)
- **Dropping `'unsafe-inline'` from `script-src` in Next 16 is not perf-neutral** — a nonce forces ALL pages dynamic (kills static/ISR/PPR/CDN). Try `experimental.sri` first (keeps static, build-time chunks only); nonces only when inline scripts truly need them. (reference-csp-nonce-vs-sri-nextjs)

### Realtime / dev server
- **pusher-js (any tab-singleton channel): bind without unbind = handler leak** — `subscribe(name).bind("changed", h)` on every mount without `unbind` in cleanup stacks handlers on fast re-nav → CPU climb. Capture the handler + `unbind` in effect cleanup. (v6 retro)
- **Thin-event liveness pattern:** push `{v,type,sourceId}` (never content), clients refetch through idempotent latest-wins reads (the read path IS recovery). Publish post-commit best-effort (swallow all failures), no-op without `PUSHER_*` env (lazy import), private per-scope channels + session-gated auth, echo-skip own writes via `CLIENT_SOURCE_ID`, coalesce ~300ms. (ADR-0027)
- **A pegged Next dev server is usually the Turbopack watcher, not your app** — `sample <pid>`; hot frames in `next-swc*.node` + `notify-rs` = Turbopack (spinning, not compiling). Dev-only. Fix: restart · `dev:webpack` isolate · tame timer `router.refresh()`. (reference-turbopack-dev-high-cpu)

### AI / LLM
- **Anthropic structured-output rejects `maxItems`** (and similar unsupported JSON-Schema keywords) with a 400 — drop it, cap in code. (v6 retro)
- **Small-corpus search shortcut** (ADR-0005): read the whole catalog, ask a cheap model (Haiku) to rank — cross-lingual + diacritics-insensitive by nature. Pure core (prompt/parse/map) + thin shell; structured `{ids:string[]}`; debounce ~400ms; cap `MAX_CATALOG_ITEMS` with an explicit `truncated` flag; graceful no-key fallback (client substring scan). Successor = embeddings+pgvector.

### shadcn / UI primitives
- **App-level `<TooltipProvider>` required** by radix-maia/mira tooltips (missing → SSR-500). **`@import "shadcn/tailwind.css"` in globals.css** for maia variants/keyframes. Migrate from the visible preset, never `init --preset <token>` (classifier-blocked remote exec). (reference-shadcn-maia-migration-gotchas)
- **shadcn size variants gate on `[&_svg:not([class*='size-'])]:size-N`** — override by putting `size-N` on the SVG, not the parent. (reference-shadcn-size-not-selector)
- **Plain-utility override no-ops? suspect a `:has()`/`group-data-*` variant, reach for `!`** — e.g. ItemGroup `has-data-[size=xs]:gap-2` outranks `gap-0` → `gap-0!`. (reference-itemgroup-gap0-specificity)
- **lucide-react dropped brand icons** — use `@icons-pack/react-simple-icons` (`Si<Brand>`, `color="default"`). (reference-lucide-brand-icons-gone)
- **Magic UI `Dock` injects props via `cloneElement`** — `DockIcon` must be a direct child; put the `<Link className="absolute inset-0">` overlay inside it. `magicui.design/r/<name>.json` is the free public registry (shadcn.io is paid-gated). (reference-magicui-*)
- **linkifyjs: `attributes` is flat HTML attrs; `className` is the type-keyed prop** — don't nest `{url:{className}}` under `attributes`. (reference-linkifyjs-api-attrs-vs-classname)
- **Primitives with hardcoded colors** (NumberTicker `text-black dark:text-white`) need `text-current` via className so tailwind-merge drops the baked value.
- **Radix Dialog/Drawer warns without a `Description`** — add an `sr-only` one. **vaul Drawer auto-focuses first field** — `onOpenAutoFocus={e=>e.preventDefault()}` on `DrawerContent`. **A Radix menu opening a Vaul drawer from `onSelect` must be `modal={false}`** (modal menu locks `<body>` pointer-events → freeze after close). **Menu-item radius must be < the container's inner radius** (focus bg bleeds at large radii). **vaul direction defaults are conservative** — override via `data-[vaul-drawer-direction=…]`.
- **A pinned-chrome scrollable drawer = flex column, `shrink-0` header/footer, single `flex-1 min-h-0 overflow-y-auto` body** (bounding a nested list's scroll isn't enough). (2026-07-24 retro)
- **shadcn `FieldLabel` wrapping a `Field` already IS the "choice card"** (`has-data-[state=checked]:`) — don't hand-roll. **`grid-rows-[1fr]↔[0fr]` + `overflow-hidden`** animates to/from auto height without JS.

### View Transitions
- **`flushSync` + async router don't mix inside `startViewTransition`** — recipe: selection in component state + `history.replaceState` for the URL + a params-adoption effect. **Duplicate `view-transition-name`s abort the transition; a transition freezes the live page** — gate mid-exit overlays with a fixed delay; Chrome 125+/Safari 18.4+, degrades gracefully. (ON.12 retro)

### Security
- **User-submitted links:** http(s) scheme allow-list (drop `javascript:`/`data:`) + `target="_blank" rel="noopener noreferrer"` + show hostname. Keep the guard in a pure unit-tested module. (reference-external-link-security)

---

## 15. Reusable patterns mined from domain ADRs (business stripped)

- **Provider-interface + stub** (ADR-0015): any external vendor (payment/verify/email) → an interface + `createXxxProvider(config)` (real, HMAC-signs) + `createStubProvider({script})` (previews) + `selectProvider(env)` (prod→real, never silent stub fallback). **Webhook is the source of truth; the redirect/return URL is untrusted UX.** Confirm command idempotent (webhooks re-deliver). "Retry" scales to the failed dependency: lost webhook on a maybe-charged txn → actively query the provider before expiring; internal reaction crash → fast backstop on a nullable marker column; slow human downstream → bounded day-scale backoff → dead-letter.
- **"AI proposes, humans dispose"** (ADR-0029): the AI never issues commands — its output is a **suggestion row** (plain CRUD, `pending→accepted|dismissed|expired`, NOT an ES aggregate). **Accepting = one transaction** (suggestion resolved + real command issued atomically); the **accepting human is the actor**; the event carries additive provenance (`origin:'ai-suggested'` + `suggestionId`). No "AI actor" in Deciders. Every "let the agent do X" idea passes this gate.
- **Data-scope an LLM agent at the tool layer, not the prompt** (ADR-0021): each tool is a closure partial-applied with the scope id + viewer access context; no scope-selector arg, no raw-SQL tool. A prompt-injected model can at worst call the same read tools (in-scope rows only). **Token metering:** an `agent_usage` row per turn (`input/output/cacheRead/cacheCreate` tokens, model, kind, scope+user), per-user/day + per-scope/month caps → 429.
- **Bounded multi-agent group orchestration** (ADR-0030): a cheap router step (Haiku structured output over roster name+role, `@mention` override) → ordered, capped (≤3) responders; each responds once per turn, sequentially, seeing prior replies; **no autonomous inter-agent loops** (cap + one-reply-per-turn are the cost guard). Per-reply metering replay-safe by a deterministic ref.
- **Polymorphic single table** (ADR-0023): one `comments(subjectType, subjectId)` + one repo for a cross-entity concern (brand `subjectId` at the edge). **Best-effort side-write seam:** a `notify(...)` helper reactions call fire-and-forget — a failure is swallowed+logged, never rolls back the money/state write. **Idempotent awareness inserts:** `UNIQUE(userId,type,subjectType,subjectId)` + `ON CONFLICT DO NOTHING`.
- **Authorization in the shell, not the Decider** (ADR-0014/0016/0018): `requireXAccess({minRole})` resolves the relationship and redirects/throws before `decide`; in-`decide` actor checks are a final guard (defense in depth). **Private resource = 404, not 403.** Privileged actions issue the **same domain commands** carrying an `adminId` (audited in the same log), never a side-channel. **Escape-hatch/maintainer gate via an env allowlist, not a DB role** (a compromised admin can't self-grant); expose curated levers, never raw command dispatch; audit the auditor.
- **Server-side redaction seam** (ADR-0017/0024): a pure `sectionVisibility(section,isOwner)` policy + a `toView({isOwner})` builder that nulls restricted fields; `getXForViewer(id, viewerId)` (`React.cache`-wrapped) returns an already-redacted view or `null → notFound()`. New restricted field → gate once in the policy, never ad-hoc `isOwner &&` in pages. Public URL `/u/[username]` literal (no `@`-slot rewrite); one implementation, `isOwner` toggles chrome.
- **Branded-integer domain unit** (ADR-0020): store a domain quantity as `Tagged<bigint,'Unit'>`, never a float/percentage/money alias; divide to a percentage once at the display edge; threshold math as integer cross-multiplies against basis points. **Money as integer** (`bigint` smallest unit); a ledger whose `decide` makes overdraft unrepresentable (`available = deposited − earmarked − paidOut ≥ 0`).
- **Degradable capability hook** (ADR-0032): for an unshipped/flag-gated browser API, one `useMcpTool({name,description,inputSchema,execute})` that feature-detects the host, registers on mount / unregisters on cleanup, try/catch no-ops when absent. Register mutations page-level, behind the "propose don't act" surface. **Don't ship speculative code against an untestable API — write a defer-ADR.**

---

## 16. Process & workflow rules

- **`bun run test:coverage` (both projects) is the real gate** — unit-only misses `withTransaction`, repository bodies, env-throw branches. (feedback-test-coverage-full-gate)
- **Never `git commit --amend`** — fix forward; backfill SHAs into the done-log via a separate follow-up. (feedback-never-amend)
- **Conventional Commits, atomic, one semantic type per commit.** Trunk branch for daily work; `main` is release-only. Branch before committing if on the default branch.
- **Green CI ≠ live-ready** — DB migrations + new env vars aren't automated on deploy; call them out as explicit owner follow-ups every schema/secret-dependent ship.
- **Migrations ordered/append-only across branches; ADRs may be non-contiguous** — several unmerged branches each adding a migration → number the later branch's after the other's; reserve the number when you branch.
- **Stacked-PR discipline:** base each PR on its dependency branch; don't `--delete-branch` mid-stack (auto-closes the next PR); `rebase --onto main` each layer; re-target a review-PR's base to `main` to turn it into the merge-everything PR.
- **Defer non-blocking improvements** until concrete pain (≥3 places). Audit findings reported, not auto-fixed. (feedback-defer-until-needed)
- **"Review code" defaults to a quick inline self-review** — reserve heavy multi-agent review for an explicit "thorough" ask. (feedback-casual-review-default)
- **Fan-out read-only audits before building** (server loads · bundle · loading-UX · duplication) — ground-then-act beats guessing. **Map reuse seams first** with a read-only pass (yielded ~60% reuse). **Confirm the real taxonomy** behind a "unify X" ask before applying one rule everywhere. **Research before speculative code** — spec-TODO/flag-gated/untestable → defer-ADR. **Device/preview-driven checks** catch what gates can't (Safari layout, gestures, cookie flags). **Split a design-system migration into its own PR** and smoke the running app.
- **ADRs:** 4-digit filename `NNNN-<slug>.md`, prose `ADR-NNNN`. Open one as the phase begins, not upfront. A locked decision is "Accepted." Build a diagnostic probe before an ADR about runtime behavior; delete it, keep the recipe.
- **Filenames:** kebab-case inside `src/` and docs; PascalCase component identifiers in kebab files; root tooling files (`CLAUDE.md`, `README.md`, `AGENTS.md`) conventional casing. Imports absolute via `@/`.

---

## 17. Definition of Done (per subsystem)

Endpoints named as business operations · all ids/validated primitives branded · domain state = tagged unions (no bag-of-optionals) · all business rules in pure invariants+derivers · derivers return discriminated-union outcomes (no throws for expected failures) · controllers partial-applied taking repos/services · repositories have an in-memory impl used in tests · route handlers/actions are thin HTTP↔domain maps · no lodash/axios/enum/class-entity/`let`-in-domain · no direct `import{db}` in repos · pure code takes all deps as explicit params · multi-write atomic ops in `withTransaction()` · no `as unknown as X` outside boundary constructors · `ts-pattern` exhaustive at every union consumption · tests run against in-memory repos with no DB/network · **a decision log explaining the abstraction-level choices**.

---

_Source: `infinite-oneness` — `dev-workflow.md`, `dev-style.md`, `CLAUDE.md`, `__project__/docs/{architecture,design,retro}.md`, all 32 ADRs, and the memory store. Business/domain content removed; provenance tags retained for tracing._
