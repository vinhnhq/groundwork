# Groundwork

[![CI](https://github.com/vinhnhq/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/vinhnhq/groundwork/actions/workflows/ci.yml)

A git-backed **grounding layer for a mixed-agent team**. Every teammate's AI agent reasons from the
same canonical docs, and the ones who cannot use git still keep the backlog in sync.

- **Portfolio** (public): introduces the projects.
- **Ops console** (private): every ADR / spec / plan / task / retro across all project repos, a
  cross-project READY queue, and a client-idea triage surface.
- **Grounding**: one distilled **Brain digest** per project, served through three doors — copy to
  clipboard, `context.md` export, and MCP (local stdio or remote HTTP). All byte-identical.
- **Git-free sync**: PM/QA capture tasks and move statuses in the UI; Groundwork writes back to the
  repo's `backlog.md` on a branch or as a PR.

Canonical project docs live in each project repo as Markdown. Groundwork is a projection of them
plus a write-back path — it never becomes a second database of tasks.

## Docs
- Architecture + build plan → [`__project__/docs/architecture.md`](__project__/docs/architecture.md)
- Technical standards → [`__project__/docs/tech-standards.md`](__project__/docs/tech-standards.md)
- Current spec → [`__project__/specs/v2-grounding.md`](__project__/specs/v2-grounding.md)
- What's next → [`__project__/tasks/backlog.md`](__project__/tasks/backlog.md)
- Decisions → [`__project__/docs/decisions/`](__project__/docs/decisions/)

**Live:** <https://groundwork-zeta-wheat.vercel.app> — deployed from `main` via Vercel.
It serves **demo data**; see *Status* below.

## Status

🟢 **v1 Foundation + v2 Grounding + v3 Sync + F5 Auth shipped.** 🟡 **Several integrations are
still mocked on purpose** — no API keys yet. Sign in and open **/ops/integrations**: it lists every
seam, whether it is live or mocked, and the exact variable that makes it real.

Auth is real as of 2026-07-29: **better-auth over Kysely/Postgres, username + password, no social
providers** ([ADR-0008](__project__/docs/decisions/0008-auth-username-password.md)). Four accounts,
one per role; the role name is the username. Public sign-up is disabled.

Still to do: **`DATABASE_URL` on the deployed instance** (without it nobody can sign in — there is
no fallback store), and v5 packaging (`@groundwork/engine`, CLI).

### Deploy

Vercel is connected to this repo: a PR gets a preview deployment, a merge to `main` goes to
production. To make the deployed instance read **real** repos instead of the built-in fixture, add
`GITHUB_TOKEN` (contents: read) and `GITHUB_REPOS` in the Vercel project — no code change.

The deployed instance needs a **`DATABASE_URL`** (Neon) plus `bun run migrate && bun run seed`
against it. Set `ADMIN_PASSWORD` first, or the seeder refuses to run: it will not put the
development password on a public URL.

## Run

```bash
git clone https://github.com/vinhnhq/groundwork.git
cd groundwork
bun install
cp .env.example .env.local          # set PROJECT_ROOTS to your repo paths (comma-separated)

docker compose up -d                # Postgres on 55432 (dev + test databases)
bun run migrate && bun run seed     # better-auth schema + the four role accounts
bun run migrate --test              # schema for the integration suite

PROJECT_ROOTS="/abs/path/to/repo-a,/abs/path/to/groundwork" bun run dev
# open http://localhost:3000/ops — sign in as `engineer` / `groundwork-dev`
```

The four accounts are `engineer`, `pm`, `qa`, `client` — the role name is the username. Re-running
the seed is safe: it re-asserts roles and leaves existing passwords alone.

Every project root needs a `__project__/project.yml`; without one it shows as *unconfigured*
rather than failing. Groundwork's own repo is a valid root — point it at itself to see the
dogfood view.

Sign in with any demo account (the sign-in page lists them, one per role):

| Role | Email | Can |
| --- | --- | --- |
| Engineer | `engineer@groundwork.local` | Everything — write-back, triage agent, integrations |
| PM | `pm@groundwork.local` | Board + grounding. No agent, no secrets |
| QA | `qa@groundwork.local` | Board + grounding. No agent, no secrets |
| Client | `client@groundwork.local` | Read-only |

Password for all of them: `groundwork` (override with `ADMIN_PASSWORD`).

## Ground an agent

```bash
# Local MCP (read-only) for a Claude Code session
claude mcp add groundwork -- bun run /abs/path/to/groundwork/src/mcp/server.ts
# needs PROJECT_ROOTS in the environment
```

Tools: `list_projects` · `ready_tasks` · `get_project_context` · `get_doc`. Read-only by
construction — see [ADR-0006](__project__/docs/decisions/0006-mcp-surface.md).

For a teammate on another machine, `POST /api/mcp` speaks the same tools over JSON-RPC behind
`Authorization: Bearer $MCP_TOKEN`. For an agent that speaks no MCP, **Copy context** on any
project or `GET /ops/<project>/context.md`.

## Test

```bash
bun run test                 # unit + integration (never `bun test`)
bun run lint && bun run typecheck && bun run build
PROJECT_ROOTS="$PWD/src/tests/fixtures/repo-ok,$PWD/src/tests/fixtures/repo-bare" bun run test:e2e
```

CI runs all of these on every PR — the four gates in one job, Playwright in another, so a
browser failure is distinguishable at a glance from a type error.
