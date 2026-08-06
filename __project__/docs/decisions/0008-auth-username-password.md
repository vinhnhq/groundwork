---
id: gw-adr-0008
kind: adr
title: Auth — username + password
description: better-auth with username and password, no social providers, and a two-layer role gate the edge cannot fake.
status: accepted
updated: 2026-08-06
---

# ADR-0008 — better-auth with username + password, and a two-layer role gate

Decided: 2026-07-29

## Context

Auth was the last labelled mock. `src/lib/auth/index.ts` said so in a comment: the
better-auth adapter "cannot be built or verified without `DATABASE_URL` +
`BETTER_AUTH_SECRET`, and shipping unverified auth that switches itself on the moment an
env var appears is worse than a clearly-labelled gap." Four accounts lived in memory and
sessions were a hand-rolled HMAC cookie verified in the edge proxy.

`architecture.md §8` and `.env.example` both specified **email + password**. Asked
directly, Vinh chose **username + password** and ruled out registering a Google OAuth
client. The docs were wrong, not the request.

Two constraints shaped the rest:

- The proxy runs on the **edge runtime**, where there is no database handle. The old
  design got away with an authoritative role check there because the role travelled inside
  a cookie the proxy could verify by HMAC on every request.
- Groundwork is a **private console with four accounts**, not a product with a signup
  funnel.

## Decision

**better-auth over Kysely/Postgres with the `username` plugin. No social providers.**

- Sign-in is by username. The role names *are* the usernames (`engineer`, `pm`, `qa`,
  `client`). `minUsernameLength: 2`, because two of them are two characters and the
  plugin's default of 3 rejected them.
- `role` is an additional field with **`input: false`** — it cannot be set through any
  request payload, only server-side. Without this, sign-up and update payloads accept a
  `role` and a caller can simply ask to be an engineer.
- **`disableSignUp: true`.** An open `/api/auth/sign-up/email` on a public URL lets anyone
  mint an account. Accounts come from `bun run seed`, which lifts the flag for its own
  in-process instance only.
- Email stays as a required core column (better-auth's schema demands it), filled with
  `<role>@groundwork.invalid` — a domain RFC 6761 reserves, so it can never be mistaken
  for deliverable.

**The role gate is two layers, and the split is the load-bearing part.**

| Layer | Sees | Role of |
|---|---|---|
| `proxy.ts` (edge) | Session cookie present? Signed 5-minute cookie cache | Fast path. Fails closed on "no cookie"; **not** the authority |
| `requireCapability` (page) / `capabilityResponse` (route) | The `session` table | The authority |

A cookie-cache miss is **not** a denial — the proxy waves it through, because denying
would bounce a legitimately signed-in user to `/sign-in` every five minutes. That is only
safe because the page re-checks.

## Consequences

- **A live gap was closed.** `/ops/integrations` and `/ops/<project>/triage` had *no*
  server-side capability check at all; they relied entirely on the proxy. Under the old
  always-authoritative proxy that was survivable. Under a cookie cache it is not, and the
  first end-to-end test of it showed a `client` reaching both. An e2e test now drops the
  cache cookie and asserts neither page's content is served.
- **A wrong conclusion, recorded because it nearly shipped.** That same test *appeared* to
  fail again after the fix, because `/ops/integrations` answered `200`. Reading the body
  showed the `/ops` page with `denied=integrations.view` and none of the protected content
  — the guard had worked and the status code was the wrong thing to assert on. Verify by
  looking at what is served, not at the status line.
- **`DATABASE_URL` is now load-bearing.** There is no fallback store; without it nobody can
  sign in. The deployed instance does not have one yet.
- **Migrations are derived, not written.** `bun run migrate` calls better-auth's
  `getMigrations` with the *same options object the app runs on*, so the schema cannot
  drift from the config. CI runs it, which makes the drift check automatic.
- The driver is chosen by URL host — `pg` for a local container, Neon's WebSocket pool for
  `*.neon.tech`. Both are a `PostgresDialect`; `kysely-neon`'s `NeonDialect` wraps the HTTP
  client, whose `beginTransaction` is a **silent no-op**, and better-auth writes a user and
  its credential account together.

## Alternatives considered

- **Email + password**, as the docs said. Rejected by the owner.
- **Google OAuth.** Rejected: registering an OAuth client and carrying its secret is not
  worth it for four accounts.
- **Running the proxy on the Node runtime** so it could query the database and stay
  authoritative. Rejected: a per-request database round-trip on every `/ops/**` navigation,
  to avoid a defence-in-depth check the pages should have had anyway.
- **Failing closed on a cookie-cache miss.** Rejected: correct, but it signs the user out
  every five minutes.
