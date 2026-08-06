---
id: gw-adr-0001
kind: adr
title: ContentSource — filesystem first
description: Read project docs from sibling repos on disk; add the GitHub adapter only when the console is actually deployed.
status: accepted
updated: 2026-08-06
---

# ADR-0001 — ContentSource: filesystem-local first

Decided: 2026-07-25

## Context

Groundwork is a read-only projection over the canonical Markdown in each project
repo (`__project__/**`). It needs to _read_ those repos. Options: (a) filesystem —
read sibling repos on disk; (b) GitHub contents API; (c) a build-time clone.

## Decision

Ship a `ContentSource` interface with a **filesystem adapter first**, selected via a
`PROJECT_ROOTS` env (comma-separated absolute paths). The interface has one method
set (`listProjects`/`getProject`/`listDocs`/`readDoc`/`readBacklog`) so a GitHub
adapter can be added later behind the same seam when Groundwork is deployed publicly.

## Rationale

- The tool runs beside the repos it aggregates (solo dev, local-first) — filesystem
  is zero-network, fastest, and the agent can read the same files natively.
- Keeping it behind an interface means the deploy story (GitHub API / clone +
  `revalidateTag` on a push webhook) is a single new adapter, not a rewrite.

## Consequences

- Deployed (Vercel) usage is **not** possible until the GitHub adapter lands — flagged
  as the follow-up for the public-portfolio version.
- `PROJECT_ROOTS` must be set for the ops console to show anything; empty → an explicit
  "no roots configured" state, never a crash.

## Enforcement

- `createFilesystemSource(roots)` is pure over its `roots` argument (unit/integration
  tested against `repo-ok`/`repo-bare` fixtures); the env is read only in the
  `getContentSource()` factory.
