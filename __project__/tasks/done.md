# Done — archive (newest at top)

Format: `- YYYY-MM-DD · <sha> · <task-id> short description`

- 2026-07-29 · W7 · Motion pass — one `Reveal` primitive, transform/opacity only, `useReducedMotion` checked in JS (the CSS override cannot reach Motion's rAF-driven values)
- 2026-07-29 · W6 · Grounding relayout + audience digests (tech/biz/both); `biz` also had to drop task intent+oracle — the backlog's own rationale was leaking into the delivery view
- 2026-07-29 · W5 · Triage → create-project form layout; Field/FieldLabel needed explicit htmlFor/id (an a11y regression, not just a test break)
- 2026-07-29 · W4 · Overview → cockpit (ready / blocked+draft / docs), no extra query
- 2026-07-29 · W3 · Tasks board ⇄ table toggle; fixed a pre-existing `SidebarInset` min-width bug that let any wide surface scroll the page
- 2026-07-29 · W2 · Docs folder tree over the whole `__project__/` — architecture.md and tech-standards.md had never been ingested (7 docs → 13)
- 2026-07-29 · W1 · Ported item/tabs/textarea/field/label/empty + installed `motion`
- 2026-07-29 · UI · radix-maia token set completed (`--sidebar-*` ×8 were referenced 92× and defined 0×; `tw-animate-css` missing so every overlay had no transition) + borderless tables, status variants, tasks filter row — ADR-0009
- 2026-07-29 · F5 · better-auth over Kysely/Postgres, username+password, no social — ADR-0008. Closed a live gap: /ops/integrations and /ops/*/triage had no server-side capability check
- 2026-07-29 · favicon · lucide `list-checks` (ISC, no attribution) — stroke 2.75 + cropped viewBox for 16px legibility
- 2026-07-29 · deploy · Vercel project connected to GitHub (PR → preview, main → production); public at groundwork-zeta-wheat.vercel.app
- 2026-07-29 · sec · Never advertise demo credentials in production — the sign-in page printed working engineer creds (PR #3)
- 2026-07-29 · sec · Refuse to sign sessions with the published dev secret; asset route confined to `__project__/` (PR #1 QA)
- 2026-07-29 · Q1–Q6 · Six QA findings grounded as DoR-ready tickets (PR #2)
- 2026-07-29 · CI · Playwright suite runs on every PR (PR #1)
- 2026-07-28 · F5/R1 · Signed sessions (Web Crypto HMAC, edge-safe) + role matrix + /ops/integrations. better-auth over Neon still NOT wired
- 2026-07-28 · US-3/US-4 · Task capture + status flip UI — live DoR, honest pending/mocked reporting
- 2026-07-28 · S4 · GitHub write-back — branch → commit → PR, mock client (no token)
- 2026-07-28 · S3 · GitHub ContentSource (read) + signature-verified push webhook
- 2026-07-28 · S2 · Local-git write-back on a groundwork/* branch, injected git runner
- 2026-07-28 · S1 · Backlog serializer (round-trips parseBacklog) + BacklogWriter seam + ADR-0002
- 2026-07-28 · G4 · Remote MCP — JSON-RPC over HTTP behind a bearer token
- 2026-07-28 · G3 · Local MCP server (stdio) — 4 read-only tools + ADR-0006
- 2026-07-28 · G2 · Paste door — Copy context + context.md, byte-identical to MCP
- 2026-07-28 · G1 · renderBrain digest + ADR-0004 (selection + size-budget policy)
- 2026-07-25 · F6.1 · Dogfood (Groundwork ingests itself, 9 tasks parsed) + ADR-0001 (ContentSource fs-first) + status flip
- 2026-07-25 · F4.2 · Project detail + doc render + path-guarded asset route
- 2026-07-25 · F4.1 · /ops overview — project list + cross-project READY queue + DRAFT list (2 E2E)
- 2026-07-25 · F3.1 · Task model + Definition-of-Ready deriver + backlog parser (deriver 100% lines)
- 2026-07-25 · F2.2 · Markdown → RSC renderer (react-markdown + mermaid + relative-image rewrite)
- 2026-07-25 · F2.1 · ContentSource — project.yml parser + filesystem adapter (int-tested)
- 2026-07-24 · F1.1 · Core lib seam — result/pipe/clock/repository/context ALS + 19 tests
- 2026-07-24 · F0.1 · Scaffold Next 16 + pinned tech-standards §0 stack + toolchain
