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
