# v1 — Foundation spec

> Rungs 1–4 of the architecture build order: the read-only ops core + auth gate. No triage/MCP yet.

## Goal

Stand up Groundwork far enough to **view, across all my project repos, every project's status + docs (ADR/spec/retro) + a cross-project "READY" task queue**, behind a basic-auth gate. Canonical Markdown stays in each project repo; Groundwork reads it (filesystem-local first).

## Out of scope (this version)

- The client-idea triage agent + write-back (rung 7).
- The MCP server (rung 8).
- The public portfolio projection (rung 5) — data source shared, surface deferred.
- Object-storage asset tier (rung 6) — in-repo assets only for now.
- Deployment / GitHub content adapter — filesystem-local only.

## User stories + acceptance criteria

1. **Aggregate projects.** Given N project repos on disk each with `__project__/project.yml` frontmatter, the ops home lists them with name, status, tagline, stack. *AC:* a repo missing frontmatter is listed as "unconfigured," never crashes the page.
2. **Read a project's docs.** From a project I can open its ADRs, specs, and retro rendered as pages (mermaid rendered). *AC:* relative image links in a doc resolve and display.
3. **Cross-project READY queue.** A single view lists every task across all projects that passes the Definition of Ready, newest first, grouped by project. *AC:* a task missing any DoR field appears in a separate "DRAFT / not ready" list with the missing fields named.
4. **Auth gate.** `/ops/**` requires a signed-in session (email+password); `/` is public. *AC:* signed-out visit to `/ops` redirects to sign-in.

## Non-functional

- Pure core (frontmatter parse, backlog→Task parse, DoR deriver) is unit-tested with no I/O, ≥90% coverage.
- `bun run test:coverage` + `biome check` + `tsc --noEmit` green.
- Mobile-first; both themes; Lighthouse A11y ≥95 on the ops home.

## Open questions

- ContentSource: filesystem-local confirmed for v1; GitHub adapter deferred to the deploy version (ADR-0001 to write).
- Write-back mechanism (PR vs direct commit) — not needed until rung 7; defer ADR-0002.
