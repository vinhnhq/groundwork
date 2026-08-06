---
id: gw-adr-0006
kind: adr
title: MCP surface and transport
description: Which tools the MCP door exposes and how it is transported — local stdio and remote HTTP serving identical bytes.
status: accepted
updated: 2026-08-06
---

# ADR-0006 — MCP surface and transport

Decided: 2026-07-28

## Context

The paste door (G2) grounds any agent with zero setup, but it is manual: someone must remember to
copy, and the moment they forget, the agent is stale again. For the engineer's own Claude Code
session — the one editing the repo — grounding should be _live_.

Both GPT and Claude speak MCP, so one server can ground the whole team. The open questions are
what the tools are, what transport carries them, and — most importantly — whether an agent that
reads the ground may also change it.

## Decision

**Four read tools**, deliberately shaped around what an ungrounded agent gets wrong:

| Tool                                    | Purpose                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `list_projects`                         | Discovery. Slugs, status, ready-counts; unconfigured roots reported, not hidden.       |
| `ready_tasks(project?)`                 | The startable queue — DoR-passing, open tasks. Cross-project when the slug is omitted. |
| `get_project_context(project, budget?)` | The Brain digest of ADR-0004. The one an agent should call first.                      |
| `get_doc(project, kind, id?)`           | Full document, when the digest is not enough. Omitting `id` lists what exists.         |

**Read-only in v2, enforced by the type system.** The tools are typed against `ReadOnlySource`, a
`Pick` of `ContentSource` naming only the five read methods. When S1 adds `appendTask` /
`updateTaskStatus` to `ContentSource`, the MCP layer still cannot reach them — the narrowing makes
it a compile error rather than a code-review question. An integration test additionally passes a
source whose write methods throw and asserts none is called.

This is a real constraint, not ceremony: an agent that can both read its grounding and rewrite it
can launder its own hallucination into "current truth", and every later reader — human or agent —
inherits it as fact. Write-back exists (v3), but it goes through the UI where a human confirms and
a PR records it, which is exactly the audit trail an MCP tool call lacks.

**Transport: stdio, as a standalone bun process** (`bun run mcp`), not a Next route. The stdio
transport owns the process's stdin/stdout for the life of the session, which a request handler
cannot offer. It reads `PROJECT_ROOTS` from the environment directly rather than through
`serverEnv()`, since that module carries the `server-only` marker, which means nothing outside
Next. This is the G3 escalate-if, resolved in the direction it anticipated.

Every tool is annotated `readOnlyHint: true, openWorldHint: false`, so a client can present them
as safe without inferring it from the names.

## Rationale

- **One engine, three doors.** The tools call `loadBrain` and `parseBacklog` — the same functions
  behind the UI and the `context.md` route. A second implementation of "what is ready" would drift
  within a sprint.
- **Tool descriptions are prompts.** They say _why_ to call the tool ("read this before proposing
  work, so you do not contradict a decision the team already made"), because the description is
  the only instruction the model reliably reads.
- **Failure modes route somewhere.** A bad slug answers with "call `list_projects`"; a bad doc id
  answers with the available ids. An agent that hits a dead end otherwise guesses.

## Consequences

- Remote/HTTP transport (G4) is a separate concern: stdio cannot serve teammates on other
  machines. The tool layer is transport-agnostic, so G4 wraps the same `createGroundworkTools`.
- The read-only rule is a v2 decision, not a permanent one. Revisiting it means revisiting the
  audit-trail argument above, and should amend this ADR rather than quietly adding a write tool.
- `PROJECT_ROOTS` is a laptop-local concept. A deployed instance reads GitHub instead (S3); the
  MCP server then needs the same source swap, which the `ContentSource` interface already allows.
- Adding a fifth tool is cheap, but each one costs context in every session that connects. Prefer
  making the four richer over adding more.
