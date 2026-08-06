# CLAUDE.md

Guidance for Claude Code working in this repo. Short by design — it delegates to the docs.

## What this is

**Groundwork** — a Next.js app that (a) publicly introduces Vinh's projects (portfolio) and (b) privately gives
Vinh + a Claude agent one operational view across all project repos (ADRs · specs · plans · tasks · retro),
plus a **client-idea triage** surface where an idea is discussed live with an agent against the current docs and
then promoted (or not) into a real task. Canonical project docs live in each project repo as Markdown; this
dashboard is a **read-only projection** of them + a thin write-back path for new tickets.

## Authoritative sources (read before answering)

- **Architecture + kickoff plan** — [`__project__/docs/architecture.md`](__project__/docs/architecture.md). Intent, principles, the two projections, component map, the frontmatter keystone, the Task/DoR model, asset strategy, the triage feature, the MCP surface, the 8-rung build order, the ADRs to write.
- **Technical standards + reusable playbook** — [`__project__/docs/tech-standards.md`](__project__/docs/tech-standards.md). The business-stripped engineering DNA lifted from `infinite-oneness`: FP playbook, request-context rules, DB/auth/ES patterns, testing, UI/design-system, the gotcha catalog, and §0 the kickoff decisions to lock.
- **Current spec** — [`__project__/specs/v1-foundation.md`](__project__/specs/v1-foundation.md).
- **What to work on next** — [`__project__/tasks/backlog.md`](__project__/tasks/backlog.md) (DoR-tagged, TDD-ordered).

> **⚠ The 2026-08-05 reversal — read these three before touching data design.** Groundwork now owns
> tickets in its own database; write-back to `backlog.md` is **removed** and the GitHub token is
> read-only. Sections 4, 9 and the §3 diagram of architecture.md still describe the old write-back
> design and are stale until v3 rewrites them — the ADRs are the truth in the meantime.
>
> - [ADR-0010](__project__/docs/decisions/0010-ticket-storage-ownership.md) — **docs in the repo, tickets here.** Rationale stays canonical as Markdown in each project repo (that is what an agent reads while editing); coordination moves to the DB.
> - [ADR-0011](__project__/docs/decisions/0011-ticket-lifecycle.md) — lifecycle: `merged ≠ released`, Release as an aggregate, oracle-gated admission, priority as queue position, asymmetric human/agent preemption, tier-as-auth.
> - [ADR-0012](__project__/docs/decisions/0012-persistence-tiers.md) — what is event-sourced and what is not. **The whole ES case rests on the claim lock**; without it an audit table would have been right.
>
> Two consequences the reversal *requires*, not optional: every commit message carries a ticket id, and
> a decision made during a ticket must reach an ADR or spec **in the repo** before the ticket closes.

- **Project doc standard** — owned by `@vinhnnn/dev-workflow` → `docs/project-doc-standard.md`: the managed / seeded / grown tiers, the nine-file init set, and the routing rule (trigger in `CLAUDE.md` · body in the doc · enforcement in a check). Groundwork consumes it rather than defining its own.

## Locked kickoff decisions (from tech-standards §0)

- Stack: **Next 16 · React 19 + Compiler · TS 6 · Bun · Biome 2 · Tailwind v4 · Kysely + Neon · better-auth (username + password, no social — ADR-0008) · Zod v4 · Vitest + Playwright · shadcn radix-maia**.
- Test runner: **Vitest** projects (`unit` + `integration`). Never `bun test` — use `bun run test`.
- **A database is required to sign in.** `docker compose up -d && bun run migrate && bun run seed`,
  then sign in as username `engineer`. The integration + e2e suites need it too.
- shadcn: **wrapper-over-pristine** (`ui/*` untouched, tweaks in `components/*`).
- FP errors: homemade `Result` → graduate to `purify-ts` `Either` at ≥3 chained fallible steps.

## Definition of Ready (every task before it starts)

A backlog task is READY only when it has: intent + why · autonomy tier · `Touches`/`Must NOT` · **Oracle** (how "done" is verified) · **≥2 pointable evidences** (file:line / ADR / test / doc) · `Escalate if`. Otherwise it's DRAFT — discuss, don't build.

## Conventions

kebab-case filenames in `src/` and docs; PascalCase component identifiers. ADRs `NNNN-<slug>.md`. Conventional Commits, atomic, never amend. Full rules in `tech-standards.md` §16.
