# Groundwork

Turns client ideas into ready-to-build tickets, grounded in your real docs — one view across every project.

- **Portfolio** (public): introduces the projects.
- **Ops console** (private): every ADR / spec / plan / task / retro across all project repos, a cross-project "READY" queue, and a client-idea triage surface where an agent analyzes an idea against the current docs before it becomes a task.

Canonical project docs live in each project repo as Markdown; Groundwork is a **read-only projection** of them plus a thin write-back path for new tickets.

## Docs
- Architecture + build plan → [`__project__/docs/architecture.md`](__project__/docs/architecture.md)
- Technical standards → [`__project__/docs/tech-standards.md`](__project__/docs/tech-standards.md)
- Current spec → [`__project__/specs/v1-foundation.md`](__project__/specs/v1-foundation.md)
- What's next → [`__project__/tasks/backlog.md`](__project__/tasks/backlog.md)

## Status
🟢 **v1 Foundation F0–F4 shipped** — a running read-only ops console (project list · cross-project
READY queue · DRAFT list · doc render) over local repos via `PROJECT_ROOTS`. **F5 (auth) is blocked
on an owner-provided Neon `DATABASE_URL` + `BETTER_AUTH_SECRET`.** See [backlog](__project__/tasks/backlog.md).

## Run
```bash
bun install
cp .env.example .env.local          # set PROJECT_ROOTS to your repo paths (comma-separated)
PROJECT_ROOTS="/abs/path/to/repo-a,/abs/path/to/groundwork" bun run dev
# open http://localhost:3000/ops
```
