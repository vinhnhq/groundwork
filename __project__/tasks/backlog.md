# Backlog — TDD-ordered, DoR-tagged

> Each leaf: **red → green → refactor → commit**, atomic. A task starts only when it passes the **Definition of Ready** (intent · autonomy tier · Touches/Must-NOT · Oracle · ≥2 evidences · Escalate-if). DRAFT = discuss first.
> Status: ✓ done · → in progress · · ready · ✎ draft (not ready) · ⏸ blocked · ↷ stretch
> Autonomy: **S**upervised · **P**lan-gated · **D**ark · **T**rivial (tech-standards §0/DoR).

Dogfooding note: Groundwork has its OWN `__project__/` docs + (soon) `project.yml`, so it appears as a project in itself — the first end-to-end test of ingest + DoR.

---

## v1 — Foundation (rungs 1–4)

> **Status 2026-07-25:** F0–F4 + F6 SHIPPED (autonomous build, gated per rung — see done.md).
> **F5 (auth) SHIPPED 2026-07-29** — better-auth over Kysely/Postgres, username + password, no
> social providers (ADR-0008). Local dev runs on `docker compose up -d`; the deployed instance
> still needs a Neon `DATABASE_URL`.
>
> Dogfood finding: pointed at its own root, Groundwork parses its 9 tasks but flags most as DRAFT
> "missing intent" — because these tasks carry intent in the title, not an explicit `**Intent:**`
> field. The DoR gate policing its own backlog, working as designed. Follow-up: add explicit
> `**Intent:**` lines to future tasks (or relax the parser to treat the title as intent — a real
> product decision for v3's triage draft-ticket format).

- [x] **F0.1** Scaffold Next 16 + pinned stack + toolchain. *(2026-07-24)*
- [x] **F1.1** Core lib seam — result/pipe/clock/repository/context + tests. *(db.ts/db-pool.ts runtime singletons deferred to F5; 2026-07-24)*
- [x] **F2.1** ContentSource: `project.yml` parser + filesystem adapter. *(2026-07-25)*
- [x] **F2.2** Markdown → RSC renderer (react-markdown + mermaid + relative-image rewrite). *(shipped in F4; 2026-07-25)*
- [x] **F3.1** Task model + DoR deriver + backlog parser. *(2026-07-25)*
- [x] **F4.1** `/ops` overview — project list + READY queue + DRAFT list. *(2026-07-25)*
- [x] **F4.2** Project detail + doc render pages + asset route. *(2026-07-25)*
- [x] **F6.1** Dogfood (Groundwork ingests itself) + ADR-0001 + status. *(2026-07-25)*

### F5 · Auth gate (rung 4)  → **[P]**  ✅ shipped 2026-07-29 (ADR-0008)
- [x] **F5.1** better-auth (**username**+password, four role accounts) over Kysely/Postgres; schema derived from the same options object the app runs on (better-auth owns its four tables and their **text** ids — the integer `users.id` override in tech-standards §7 does not apply and was dropped); `src/proxy.ts` gates `/ops/**` as a fast path, `requireCapability` is the authority; `/` public. Un-defers `db.ts` as `src/db/`.
  - **Intent:** gate the private ops console behind a session; keep `/` public.
  - **Touches:** `src/lib/{db,db-pool,auth,auth-client}.ts`, `src/db/**`, `src/proxy.ts`, `src/app/sign-in/**`. **Must NOT:** the content/tasks read layer.
  - **Oracle:** integration test (session lookup) + Playwright: signed-out `/ops` → redirect to sign-in; signed-in → ops home.
  - **Evidence:** tech-standards §7 (better-auth schema + integer-id footgun) · spec v1 story 4.
  - **Escalate if:** `@better-auth/kysely-adapter` needs a Kysely version other than the pinned `^0.28`.

---

## v2 — Grounding & Team Sync  (spec: `specs/v2-grounding.md`)

> **The pivot (2026-07-28):** solo tool → **grounding layer for a mixed-agent team**
> (engineer + PM + QA). Two problems: keep everyone's agent grounded in the same docs
> (Brain digest → MCP + paste), and let non-git teammates sync tasks (git-free write-back).
> Portfolio (old v2) + mock-triage (old v3) already shipped in v1. Reverses the solo
> non-goal in `architecture.md §14` — see **ADR-0007**.

### G · Grounding (headline — cheapest high-value, no new infra)

- [x] **G1** `renderBrain(project) → digest` — pure digest (current state + locked decisions + open constraints + READY tasks) that any agent consumes.  → **[P]**
  - **Intent:** one distilled, size-bounded current-truth digest per project so mixed-agent teammates stop drifting from locked decisions.
  - **Touches:** `src/lib/brain/{render-brain,types}.ts` + `__tests__`. **Must NOT:** the ContentSource write layer, any route/UI.
  - **Oracle:** unit test — from fixture docs (project.yml + ADRs with `Status:` + backlog), the digest includes the locked decisions + open constraints + the READY list, excludes done/draft noise, and stays within the size budget.
  - **Evidence:** spec v2 §3 US-1/US-2 + §6 ADR-0004 · infinite-oneness v6 `renderBrain` Project-Brain precedent · existing `parseBacklog`/`readiness` in `src/lib/tasks`.
  - **Escalate if:** the digest can't stay in budget without dropping decisions → the selection/size policy is a product call (ADR-0004).
- [x] **G2** Paste door — "Copy context" button + `context.md` export route.  → **[S]** *(2026-07-28)*
  - **Intent:** give non-Claude agents (PM's GPT) the digest with zero setup — copy + a `.md` export.
  - **Touches:** `src/components/copy-context.tsx`, `src/app/ops/[project]/context.md/route.ts`, wire into the project view. **Must NOT:** `renderBrain` internals (consume only), the write layer.
  - **Oracle:** E2E — Copy context puts the digest on the clipboard; `GET context.md` returns the same text (single source).
  - **Evidence:** spec v2 §3 US-2 · G1 output · existing `src/app/ops/[project]/page.tsx`.
  - **Escalate if:** clipboard API is blocked in a target browser → fall back to a select-all textarea.
- [x] **G3** Local MCP server (stdio, read-only) — `list_projects` · `ready_tasks` · `get_project_context` · `get_doc`.  → **[P]** *(2026-07-28)*
  - **Intent:** let a local Claude Code session pull READY tasks + the Brain live, grounded without copy-paste.
  - **Touches:** `src/mcp/{server,tools}.ts` (reuse `lib/content`+`lib/tasks`+`lib/brain`), a `mcp` script. **Must NOT:** any mutation/write tool (read-only in v2), the auth layer.
  - **Oracle:** integration test — the four tools resolve; `ready_tasks` returns only DoR-passing tasks; no tool can write to a repo.
  - **Evidence:** spec v2 §3 US-1 + §6 ADR-0006 · architecture.md §10 · `@modelcontextprotocol/sdk`.
  - **Escalate if:** the MCP stdio server conflicts with Next bundling → ship it as a standalone bun entry, not under Next.
- [x] **G4** Remote MCP (HTTP + token) — the team's shared grounding endpoint.  → **[P]** *(2026-07-28)*
  - **Intent:** give teammates on other machines the same live grounding the engineer gets over stdio, without waiting for real auth.
  - **Touches:** `src/mcp/{http,auth}.ts`, `src/app/api/mcp/route.ts`, `env-server` (`MCP_TOKEN`). **Must NOT:** the tool layer's read-only narrowing, the cookie session.
  - **Oracle:** unit tests for the JSON-RPC dispatcher + token gate; E2E — unauthenticated POST is 401, a bearer token lists the four tools, and `tools/call` returns byte-identical text to `context.md`.
  - **Evidence:** spec v2 §4 (G4) · ADR-0006 (transport-agnostic tool layer) · `src/mcp/tools.ts` · G3's stdio server.
  - **Escalate if:** a client needs SSE / session ids — v2 ships the non-streaming half of Streamable HTTP only.

### v3 · Sync — git-free write-back

- [x] **S1** Backlog serializer + the `BacklogWriter` seam.  → **[P]** *(2026-07-28)*
  - **Intent:** let a task captured in the UI land in the repo Markdown that stays the single source of truth.
  - **Touches:** `src/lib/tasks/{serialize,write-back}.ts`, `src/lib/content/write.ts`, `writers/{memory,filesystem}.ts`. **Must NOT:** `ContentSource`'s read interface (kept read-only so MCP stays read-only by type).
  - **Oracle:** unit — `parseBacklog(renderTask(t)) === t` for every status and tier; `setTaskStatus` changes exactly one line; a duplicate id writes nothing.
  - **Evidence:** ADR-0002 · `src/lib/tasks/parse-backlog.ts` (the inverse) · spec v2 US-3/US-4.
  - **Escalate if:** the write seam would have to sit on `ContentSource` — it does not; ADR-0002 records why.
- [x] **S2** Local-git write-back — commit on a `groundwork/*` branch.  → **[P]** *(2026-07-28)* *(ADR-0002)*
  - **Intent:** give the engineer's own machine a real write path without a GitHub token.
  - **Touches:** `src/lib/content/writers/git.ts`, `writers/index.ts` factory. **Must NOT:** commit to the checked-out branch; the read layer.
  - **Oracle:** unit against a fake git runner — branch is created before the file is written, the commit carries a `Requested-by` trailer, a non-repo is refused, a failing command surfaces rather than reporting success.
  - **Evidence:** ADR-0002 (PR-by-default, branch for solo) · `src/lib/content/write.ts` seam.
  - **Escalate if:** the actor is not a valid git ident — resolved: attribution rides as a trailer, not `--author`.
- [x] **S3** GitHub ContentSource (read) + signed push webhook.  → **[P]** *(2026-07-28)* *(ADR-0001 amendment)*
  - **Intent:** let a deployed instance read the team's private repos, since it cannot read anyone's laptop.
  - **Touches:** `src/lib/content/github/**`, `github-source.ts`, `src/app/api/webhooks/github/route.ts`. **Must NOT:** the `ContentSource` interface shape (identical behaviour behind it).
  - **Oracle:** unit — the mock-backed source lists/reads docs and feeds `loadBrain` exactly as the filesystem source does; signature verification rejects wrong secret, tampered body, truncated header.
  - **Evidence:** spec v2 US-5 · `filesystem-source.ts` (the shape to match) · ADR-0001.
  - **Escalate if:** no token exists to test against — resolved: a mock client, labelled as such on /ops/integrations.
- [x] **S4** GitHub write-back — open a PR.  → **[P]** *(2026-07-28)* *(ADR-0002)*
  - **Intent:** the real PM/QA sync path — their change becomes a reviewable PR, not a direct push.
  - **Touches:** `src/lib/content/writers/github-pr.ts`, the REST client's write half. **Must NOT:** commit to the default branch.
  - **Oracle:** unit — branch → commit → PR in order, requester attributed in the body, `pending` true with a link; a failure at any step is reported rather than claimed as success.
  - **Evidence:** ADR-0002 (AI proposes, humans dispose) · spec v2 US-3 · the S1 seam.
  - **Escalate if:** GitHub needs a blob sha to update a file — handled in `putFile`.
- [x] **S5** Task capture + status flip UI (spec US-3/US-4).  → **[S]** *(2026-07-28)*
  - **Intent:** the surface PM/QA actually touch — capture a task, move its status, never see git.
  - **Touches:** `src/components/{task-capture,task-status-control,write-outcome}.tsx`, `src/app/ops/[project]/actions.ts`. **Must NOT:** report a pending write as saved.
  - **Oracle:** E2E — DoR fills in live as fields are typed; submitting reports "Proposed" + names the mock; a duplicate id shows a readable error; a status flip routes through the same path.
  - **Evidence:** spec v2 US-3/US-4 · ADR-0002 (`pending`) · the S1 write path.
  - **Escalate if:** a role without `tasks.write` reaches the action — it is re-checked server-side (R1).

### v4 · Team & auth

- [x] **F5** Auth seam + better-auth over Kysely/Postgres.  → **[P]** *(2026-07-29)*
  - **Intent:** gate the console per-person and per-role, and stop treating any cookie value as an admin.
  - **Touches:** `src/lib/auth/**`, `src/proxy.ts`, `src/app/sign-in/**`. **Must NOT:** ship unverified DB-backed auth that self-activates on an env var.
  - **Oracle:** unit — a tampered role, a foreign secret, an expired token and garbage all verify to null; E2E — a forged cookie redirects to sign-in.
  - **Evidence:** ADR-0008 · `src/lib/auth/options.ts` · `src/tests/integration/auth.int.test.ts`.
  - **Escalate if:** no Neon creds — **resolved** by running Postgres locally in Docker, so the
    migration and sign-in are executed rather than asserted. **Remaining:** set `DATABASE_URL` on
    the Vercel project and seed it; until then nobody can sign in to the deployed instance.
- [x] **R1** Roles: engineer · PM/QA · client.  → **[P]** *(2026-07-28)*
  - **Intent:** PM/QA run the board without spending tokens or seeing secrets; a client reads only.
  - **Touches:** `src/lib/auth/roles.ts`, `src/proxy.ts`, ops layout + project page, the write actions. **Must NOT:** rely on hidden UI as the control.
  - **Oracle:** unit — the capability matrix per role; E2E — PM hitting `/triage` and QA hitting `/integrations` are both redirected with `?denied=`, and a client sees no write affordances.
  - **Evidence:** spec v2 §4 (R1) · ADR-0007 (the team pivot) · `src/lib/auth/session-token.ts` (signed role claim).
  - **Escalate if:** roles need to differ per project — they are global today.

### Q · Quality follow-ups — from the PR #1 review  *(2026-07-29)*

> Found by the ship-review QA pass on PR #1 and left unfixed there on purpose: correctness and
> honesty issues, not security (the two security holes were fixed before merge). Grounded here so
> they are tickets rather than a buried review comment.

- · **Q1** Digest: keep wrapped constraint bullets whole.  → **[D]**
  - **Intent:** every constraint in the v2 spec ships as a dangling half-sentence, so the digest tells an agent half a rule and gives no sign it was cut.
  - **Touches:** `src/lib/brain/render-brain.ts` (`openConstraints`), `render-brain.test.ts`. **Must NOT:** the decision extraction, the size-budget policy.
  - **Oracle:** unit — a spec whose out-of-scope bullet wraps across source lines yields one constraint containing the whole sentence; a bullet truncated by the size budget ends in an ellipsis.
  - **Evidence:** ADR-0004 (selection policy) · `src/lib/brain/render-brain.ts` `openConstraints` is line-based · PR #1 QA finding 4.
  - **Escalate if:** joining continuation lines would swallow the next bullet — the parser has that failure mode already (field bleed).
- · **Q2** Digest: stop quoting an ADR's `Status:` line as its decision.  → **[D]**
  - **Intent:** ADR-0002 renders with "Status: Accepted (2026-07-28)" as its locked decision, which is exactly the failure ADR-0004's amendment claims to have fixed.
  - **Touches:** `src/lib/brain/render-brain.ts` (`sectionOf`, `isMetadataBlock`), `render-brain.test.ts`. **Must NOT:** the Accepted/superseded matching.
  - **Oracle:** unit — an ADR whose `## Decision` contains `###` subheadings keeps the whole section; a one-line `Status:` paragraph is never returned as the statement.
  - **Evidence:** `sectionOf` breaks at any `#{2,4}` heading · `isMetadataBlock` requires ≥2 field lines · PR #1 QA finding 5.
  - **Escalate if:** honouring subheadings blows the size budget for long ADRs — then it is a budget question, not an extraction one (ADR-0004).
- · **Q3** `ready_tasks` returns nothing for either real project.  → **[P]**
  - **Intent:** the headline MCP tool is empty on 2 of 2 real repos, because their backlogs carry intent in the title rather than an explicit `**Intent:**` field — so the feature reads as broken rather than strict.
  - **Touches:** `src/lib/tasks/parse-backlog.ts` or the DoR deriver, plus whichever fixture proves it. **Must NOT:** weaken the ≥2-evidence rule.
  - **Oracle:** unit — a task whose intent lives only in its title derives READY under the agreed rule; `ready_tasks` over the Groundwork repo returns a non-empty list.
  - **Evidence:** dogfood run — Groundwork 0 of 23 READY, infinite-oneness 0 of 24 · PR #1 QA finding 6 · ADR-0003 is still unwritten.
  - **Escalate if:** relaxing the rule would let a genuinely unspecced task through — that is a product decision and belongs in ADR-0003 first.
- · **Q4** Make the MCP read-only claim true, or narrow the claim.  → **[P]**
  - **Intent:** ADR-0006 says the tools are read-only "by type", but `ContentSource` has no write methods yet, so the `Pick` guards nothing, and `tools.ts` casts back to the full interface.
  - **Touches:** `src/mcp/tools.ts` (drop the cast), `__project__/docs/decisions/0006-mcp-surface.md`. **Must NOT:** add any mutating tool.
  - **Oracle:** the cast is gone and `bunx tsc --noEmit` still passes; a deliberate write call inside a tool fails to compile.
  - **Evidence:** `src/mcp/tools.ts:127` `source as ContentSource` · ADR-0006 "enforced by this type, not by discipline" · PR #1 QA finding 7.
  - **Escalate if:** `loadBrain` genuinely needs the wider type — then the honest fix is to narrow `loadBrain`, not to cast at the call site.
- · **Q5** `parseBacklog` should report the lines it skipped.  → **[D]**
  - **Intent:** the parser drops anything off-grammar in silence; three of my own backlog edits vanished that way (an unknown status marker, a duplicated section, an id containing `/`).
  - **Touches:** `src/lib/tasks/parse-backlog.ts`, its test, and whichever surface shows the count. **Must NOT:** loosen the grammar itself.
  - **Oracle:** unit — a backlog with a `[~]` marker and an id containing `/` returns those lines in a `skipped` list; the ops UI shows the count.
  - **Evidence:** dogfood — `[~] **F5**` parsed as nothing · `**US-3/US-4**` parsed as nothing · F3 escalate-if says conform the file, not the parser.
  - **Escalate if:** reporting skips would flag ordinary prose in every backlog — then it needs a heuristic, and a noisy warning is worse than none.
- · **Q6** Restore the link assertion on the ops project card.  → **[T]**
  - **Intent:** `ops.spec.ts` matches the project by text rather than by link role, so the entry point no longer has to be a link at all.
  - **Evidence:** PR #1 QA loosened-assertion verdict · `e2e/ops.spec.ts`.

### D · Deployed instance  *(2026-07-29)*

- · **D1** Point the deployed instance at the real repos.  → **[S]**
  - **Intent:** the live site serves the built-in fixture repo, so it demonstrates the shape of the product rather than the team's actual work — the thing it exists to show.
  - **Touches:** Vercel env only (`GITHUB_TOKEN`, `GITHUB_REPOS`). **Must NOT:** any source change; the adapter already exists (S3).
  - **Oracle:** `/ops` on the production URL lists groundwork + infinite-oneness rather than Acme Checkout, and `/ops/integrations` reports the content source as `github` rather than `github-mock`.
  - **Evidence:** ADR-0001 amendment (GitHub adapter in scope) · `src/lib/content/index.ts` `resolveSourceKind()` · `/ops/integrations` names both variables.
  - **Escalate if:** a fine-grained token cannot be scoped to contents-read on those repos alone — the write-back path would then need a separate, narrower token.

### W · Workspace UX — lift the infinite-oneness surfaces  *(2026-07-29)*

> The ops surfaces were built shape-first and read as a wireframe next to the `infinite-oneness`
> workspace they were meant to mirror. This is the pass that closes the gap. The primitives are
> already byte-identical (ADR-0009); what is missing is the *composition* — item rows, tabs, a
> real form layout, a tree — plus motion, which the standards mandated (`tech-standards §13`) and
> nothing ever installed.
>
> Order matters: **W1 unblocks every other ticket** (they all compose its primitives), and **W2
> changes the content layer**, so it lands before the surfaces that read from it.
>
> **All seven shipped 2026-07-29.** One follow-up stayed open — see W6's escalation below: the
> `biz` digest no longer carries decisions, intents or oracles, but a task *title* can still be
> indiscreet, and closing that needs a per-task visibility field rather than a section filter.

- [x] **W1** Port the missing radix-maia primitives + install `motion`.  → **[T]**
  - **Intent:** every ticket below composes `Item`/`Tabs`/`Field`/`Textarea`/`Empty`, and Groundwork
    has none of them — without this each surface would hand-roll its own row and input, which is
    exactly the divergence ADR-0009 exists to stop.
  - **Touches:** `src/components/ui/{item,tabs,textarea,field,label,empty,collapsible}.tsx`,
    `package.json`. **Must NOT:** edit any existing `ui/*` file — wrapper-over-pristine (CLAUDE.md).
  - **Oracle:** `bun run typecheck` + `bun run lint` clean with each new file imported by at least
    one surface; the files are byte-identical to `infinite-oneness/src/components/ui/<same>.tsx`.
  - **Evidence:** ADR-0009 (primitives already identical; composition is the gap) ·
    `infinite-oneness/src/components/ui/item.tsx` · `tech-standards.md §13` mandates `motion`.
  - **Escalate if:** a ported primitive needs a dependency Groundwork does not carry — then it is a
    stack decision, not a port.

- [x] **W2** Docs as a real folder tree over the whole `__project__/`.  → **[P]**
  - **Intent:** the source only scans three fixed paths (`docs/decisions/*`, `specs/*`,
    `docs/retro.md`), so `architecture.md` and `tech-standards.md` — the two files CLAUDE.md calls
    the *authoritative sources* — are **not ingested at all**. The console cannot show the docs it
    tells agents to read. A tree that mirrors the repo fixes the omission and the navigation in one
    change.
  - **Touches:** `src/lib/content/{types,filesystem-source,github-source}.ts`,
    `src/app/ops/[project]/docs/**`, `src/app/ops/[project]/[kind]/[id]/**`, `src/mcp/tools.ts`.
    **Must NOT:** break the existing `adr`/`spec`/`retro` kinds or their URLs — additive only, and
    the digest's decision/constraint extraction keys on `kind`.
  - **Oracle:** integration test — the filesystem source over `repo-ok` returns `docs/architecture.md`
    with its relative path; E2E — `/ops/groundwork/docs` renders a collapsible tree whose leaves
    open, and every pre-existing ADR URL still resolves.
  - **Evidence:** `src/lib/content/filesystem-source.ts:51-70` (three hard-coded paths) ·
    `src/lib/content/types.ts` `DocRef` has `path` but no repo-relative form · `CLAUDE.md`
    "Authoritative sources" names two files the console cannot display.
  - **Escalate if:** a repo's `__project__/` holds non-Markdown or very large files — the walk needs
    an extension filter and a size guard before it ships, not after.

- [x] **W3** Tasks: board ⇄ table view toggle.  → **[P]**
  - **Intent:** a table answers "what is the state of everything"; a status-column board answers
    "what is in flight" — the backlog is worked both ways and currently supports only the first.
  - **Touches:** `src/components/tasks-table.tsx` → split into `tasks-view.tsx` + `tasks-board.tsx`.
    **Must NOT:** change the write path — `TaskStatusControl` stays the only status mutation.
  - **Oracle:** E2E — toggling to Board renders one column per status with the same task count as
    the table, the choice survives a reload, and the phone breakpoint still renders cards.
  - **Evidence:** `src/components/tasks-table.tsx` (filters already client-side) ·
    `infinite-oneness/.../tasks-table.tsx` filter-row pattern · `e2e/mobile.spec.ts` pins the card
    breakpoint.
  - **Escalate if:** drag-to-move between columns is wanted — that is a write path with optimistic
    state and belongs in its own ticket.

- [x] **W4** Overview → cockpit.  → **[P]**
  - **Intent:** the overview is three count tiles and a repo path; it answers "how many" but not
    "what should I look at", which is the question someone opening a project actually has.
  - **Touches:** `src/app/ops/[project]/page.tsx`, new `src/components/overview-cockpit.tsx`.
    **Must NOT:** add a query — everything shown must come from the already-loaded project view.
  - **Oracle:** E2E — the overview lists the READY queue and the newest docs as activatable rows,
    and a client role sees no grounding card.
  - **Evidence:** `infinite-oneness/.../overview-cockpit.tsx` (CockpitCard/CockpitRow shape) ·
    `src/app/ops/[project]/page.tsx` current three-tile version · `src/lib/ops/load.ts` already
    returns docs + tasks.
  - **Escalate if:** the cockpit needs data the project view does not carry — then W2 lands first.

- [x] **W5** Triage → the create-project form layout.  → **[T]**
  - **Intent:** the triage page is a bare textarea and a grey button under a redundant back link;
    the sidebar already shows where you are, so the link is chrome that costs a row of vertical space.
  - **Touches:** `src/app/ops/[project]/triage/page.tsx`, `src/components/triage-workbench.tsx`.
    **Must NOT:** change `analyze`/`accept` server actions or the DoR grounding flow.
  - **Oracle:** E2E — `triage.spec.ts` passes unchanged (it drives the real controls), and no
    `← <project>` link remains in the page.
  - **Evidence:** `infinite-oneness/.../new/project-form-fields.tsx` (Field/FieldLabel/FieldError) ·
    `src/app/ops/[project]/triage/page.tsx:16-18` back link · `e2e/triage.spec.ts`.
  - **Escalate if:** removing the back link strands a surface with no way up on a phone — then the
    breadcrumb has to cover it first.

- [x] **W6** Grounding: relayout + audience-scoped digests.  → **[P]**
  - **Intent:** one digest serves an engineer's agent and a client's agent equally badly — the first
    wants locked ADRs and READY tasks, the second wants state and progress and must not be handed
    the team's internal reasoning. Splitting it is also a *disclosure* control, not just ergonomics.
  - **Touches:** `src/lib/brain/render-brain.ts` (add an audience parameter),
    `src/app/ops/[project]/grounding/page.tsx`, `src/components/copy-context.tsx`,
    `src/app/ops/[project]/context.md/route.ts` (`?audience=`), `src/mcp/tools.ts`.
    **Must NOT:** change the default digest bytes — the three doors must stay byte-identical
    (ADR-0004/ADR-0006), so `both` remains exactly today's output.
  - **Oracle:** unit — `renderBrain(x, "biz")` contains no `## Locked decisions` section and
    `renderBrain(x, "both")` is byte-identical to `renderBrain(x)`; E2E — each variant's copy button
    and its `context.md?audience=` response agree byte for byte.
  - **Evidence:** ADR-0004 (selection + size budget) · `src/lib/brain/render-brain.ts:306-342`
    section order · `e2e/grounding.spec.ts` pins door-identity.
  - **Escalate if:** `biz` would still leak an unshipped decision through a task title — then the
    audience split needs a field on the task, not a section filter.

- [x] **W7** Motion pass.  → **[T]**
  - **Intent:** `tech-standards §13` mandates `motion` and it was never installed; every surface
    transitions instantly, which reads as a page swap rather than a state change.
  - **Touches:** the surfaces above + `src/app/globals.css`. **Must NOT:** animate layout-affecting
    properties (transform/opacity only), and must respect the existing
    `prefers-reduced-motion` override in `globals.css`.
  - **Oracle:** E2E at `prefers-reduced-motion: reduce` — no surface animates and every assertion
    still passes; a Playwright screenshot after settle is identical to the pre-motion one.
  - **Evidence:** `tech-standards.md §13` "Motion" · `src/app/globals.css:93-100` reduced-motion
    block already exists · `infinite-oneness` uses `motion` in 4 components.
  - **Escalate if:** motion regresses the mobile no-sideways-scroll E2E — transform animations can
    overflow, and that test is the guard.

### v5 · Packaging — open-core  *(DRAFT / stretch — deliberately not started)*
- ↷ **P1** extract `@groundwork/engine` (workspace) — the pure core both hosts import.
- ↷ **P2** `@groundwork/cli init` + `groundwork.config.ts` scaffold (self-host).
- ↷ **P3** Cloud tier (metered, your key) — separate product decision; not before real self-hosters.

