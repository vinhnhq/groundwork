# Groundwork — Architecture (kickoff draft)

> Status: **DRAFT for kickoff in a new repo.** Owner: Vinh. Drafted with Claude, 2026-07.
> Companion to the working style already proven in `infinite-oneness` (RSC, Kysely/Neon, event-sourced
> read-models, ADR discipline, screenshot-driven loops, "AI proposes / humans dispose").

---

## Current state (2026-07-28)

**v1 Foundation shipped** (mock-based, autonomous gated build F0–F4 + F6 — see `tasks/done.md`):
read/render of each repo's `__project__/**`, the DoR-gated task model + cross-project READY queue,
doc pages, mock auth gate, client-idea triage on a mock analyzer, and the public portfolio
projection. Design system ported from infinite-oneness (radix-maia). F5 (real auth/DB) is the
intended v1 stop — blocked on owner Neon creds.

**Pivot → v2 (spec `specs/v2-grounding.md`, ADR-0007):** Groundwork becomes a **grounding layer
for a mixed-agent team** (engineer + PM + QA). Two headline capabilities: (1) a **Brain digest**
(`renderBrain`) served through two doors — a live **MCP** tool and **copy-paste/export** — so every
teammate's agent (GPT or Claude) reasons from the same current docs; (2) **git-free write-back** so
non-technical members sync tasks without touching git. This **reverses the solo non-goal in §14**.
Build order + DoR-tagged tasks: `tasks/backlog.md` (v2 = G1–G4). Delivery = open-core (self-host
lib first, Cloud tier later). AI cost = BYOK / local Claude subscription (no per-token cost).

**Process:** `dev-workflow.md` seeded from `@vinhnnn/dev-workflow` v2.4.1 (2026-07-28); the ship
ritual (`.claude/skills/ship-review`), session-log hook, and CI (`.github/workflows/ci.yml`) are
materialized. Groundwork's deliberate divergences (biome, wrapper-shadcn) are noted in that file.

**Repo:** <https://github.com/vinhnhq/groundwork>. CI runs the four gates plus the Playwright
suite on every PR.

**v2 + v3 shipped (2026-07-28, same day as the pivot).** Grounding: `renderBrain` (ADR-0004) served
through three byte-identical doors — clipboard, `context.md`, and MCP over stdio (ADR-0006) or HTTP.
Sync: a `BacklogWriter` seam (ADR-0002) with memory / filesystem / git-branch / GitHub-PR
transports, a GitHub-backed `ContentSource`, and the task-capture + status-flip UI. Auth gained
HMAC-signed sessions and a role matrix (engineer · PM · QA · client) enforced in the proxy, the
server actions and the UI.

**What is still mocked** — deliberately, pending credentials: the GitHub client (no token), the
write-back transport (defaults to a dry run), the triage analyzer (no `ANTHROPIC_API_KEY`), and the
auth store (in-memory; **the better-auth/Kysely adapter over Neon is not implemented**). `/ops/integrations`
is the live inventory of which seam is real and what activates it.

---

## Name & positioning

- **Product name:** **Groundwork** — the ops tool (the reusable thing that could be commercialized).
- **Domain:** **getgroundwork.com** (fallbacks: `groundwork.dev`, `usegroundwork.com`). The "get…"
  prefix deliberately echoes *Getting Things Done* — same "grounded, get-it-done" headspace clients trust.
- **One-line pitch:** *Groundwork turns client ideas into ready-to-build tickets, grounded in your real docs —
  one view across every project.*
- **Why the name works:** it names the core differentiator — **presume, don't assume**. Every ticket is
  *grounded* in ≥2 pointable evidences before it's built (the Definition-of-Ready gate, §6). "Ground" =
  evidence/foundation; "work" = the tickets. GTD echo is a bonus, not the basis.
- **Tool vs. portfolio (keep separate):** *Groundwork* = the sellable product/tool. *Vinh Nguyen* = the
  public portfolio instance built on it. This is the same two-projections split as the architecture (one data
  source → public portfolio + private ops) — it lets the tool be commercialized without rebranding the
  personal site.
- **Before committing (do at kickoff):** confirm `getgroundwork.com` is buyable · npm name + GitHub org free ·
  a quick USPTO/EUIPO search for a conflicting *software-class* mark (it's a common word — check the SaaS class
  specifically).

---

## 0. One-paragraph intent

A single Next.js app that (a) publicly **introduces me + my projects** (portfolio) and (b) privately gives
**me + a Claude agent one operational view across all my project repos** — every ADR, spec, plan, task, and
retro — plus a **client-idea triage** surface where an idea is discussed live with an agent against the
current docs and *then* promoted (or not) into a real task. **The Markdown in each project repo stays the
single source of truth; this dashboard is a read-only projection of it, plus a thin write-back path for new
tickets.** Same data, two projections: a curated public portfolio and a complete private ops console.

---

## 1. Load-bearing principles (do not violate)

1. **Canonical stays in the repo.** `backlog.md`, `docs/decisions/*`, `retro.md`, `specs/*` in each project
   repo are the source of truth. The dashboard **reads** them. It never becomes the place you *edit* a task —
   that would recreate the two-sources-of-truth split. (This is the CQRS pattern from `infinite-oneness`:
   MD = events, dashboard = read-model.)
2. **Two projections, one data source.** Public portfolio = curated, marketing gloss allowed. Private ops =
   raw, complete, honest (watch-outs, evidence, half-done tasks). Never leak ops into public.
3. **Ideas are dashboard-born; tasks are repo-born.** A client idea starts life here (exploratory, cheap).
   The moment it's *decided*, it's written back to the canonical `backlog.md` in the target repo. AI proposes
   the draft ticket; the human disposes; the decision lands in the canonical source.
4. **Definition of Ready is a first-class field.** Every task the dashboard shows carries a DoR status
   (READY / DRAFT) derived from its fields (intent · autonomy tier · Touches/Must-NOT · oracle · ≥2 pointable
   evidences · escalate-if). The killer MCP query is *"what's READY across all projects?"*
5. **Defer machinery.** Ship the cheapest rung that removes the pain. Order below is designed so you can stop
   early.

---

## 2. Audiences & surfaces

| Surface | Audience | Auth | Content |
|---|---|---|---|
| `/` `/projects/[slug]` (portfolio) | public / clients | none | curated project cards, tech, links, selected screenshots |
| `/ops` (dashboard) | just me + agent | better-auth (basic) | every ADR/spec/task/retro, DoR board, cross-project READY queue |
| `/ops/[project]/triage` | me (+ client in the room) | better-auth | live agent chat over the project's docs → draft ticket |
| MCP server | any Claude session | local/token | tools to query + triage across all projects |

---

## 3. Component map

```
  Project repos (canonical)                 Dashboard repo (this app)
  ┌───────────────────────┐                 ┌──────────────────────────────────┐
  │ infinite-oneness/      │   ingest        │  Ingestor (git/GitHub → parse)    │
  │   __project__/*.md     ├───────────────▶ │   gray-matter + md render         │
  │   tasks/assets/*.png   │   (read-only)   │        │                          │
  │ project-b/ …           │                 │        ▼                          │
  │ project-c/ …           │                 │  Postgres (Neon, Kysely)          │
  └───────────┬───────────┘                 │   • better_auth_*                 │
              │  write-back (commit/PR)      │   • projects (projection cache)   │
              │◀─────────────────────────────┤   • ideas / triage_messages       │
              │   promote idea → task        │   • tickets (pending write-back)   │
              │                              │   • assets (blob metadata)         │
              │                              │        │                          │
              │                              │        ▼                          │
              │                              │  Next 16 RSC + shadcn UI          │
              │                              │  Anthropic SDK (triage agent)     │
              │                              │  MCP server (stdio/http)          │
              └──────────────────────────────┴──────────────────────────────────┘
```

---

## 4. Content ingestion (how the dashboard reads project docs)

Docs are code; keep them in the repos and read them. Two modes, same parser:

- **Local dev / self-hosted:** repos are siblings on disk → read the filesystem directly (fastest, zero
  network). A `PROJECT_ROOTS` env lists the paths.
- **Deployed (Vercel):** read via **GitHub** — either the contents API or a shallow clone in a build step.
  A **GitHub webhook → `revalidateTag(project)`** keeps it fresh on push (no polling).

Parser: `gray-matter` for frontmatter + a Markdown renderer (`react-markdown` + remark/rehype; render
`mermaid` blocks client-side to match the ADR diagrams). ADRs/specs/retro become RSC pages; `backlog.md`
tasks are parsed into structured task objects (see §7).

**Recommended default:** filesystem-local first (you run it beside your repos), add the GitHub adapter only
when you actually deploy it publicly. Both implement one `ContentSource` interface so the swap is one binding.

---

## 5. The project frontmatter (the keystone — decide this first)

Add a small header to each repo (`__project__/project.yml` or the top of `backlog.md`). Both projections read it.

```yaml
slug: infinite-oneness
name: Infinite Oneness
tagline: Event-sourced DAO funding + debate platform
status: active            # active | paused | shipped | archived
visibility: public        # portfolio inclusion
stack: [next, ts, kysely, neon, better-auth]
links: { repo: "...", live: "..." }
cover: __project__/assets/cover.png
public_highlights:        # curated for the portfolio
  - "Event-sourced across 6 aggregates"
  - "Multi-persona AI advisor room"
```

Everything in §2–§3 hangs off this. It's a 10-minute decision that unblocks the rest.

---

## 6. Task model & Definition of Ready

Parse each `backlog.md` leaf into:

```ts
type Task = {
  id: string; project: string; title: string;
  status: 'draft' | 'ready' | 'in-progress' | 'done' | 'blocked' | 'stretch';
  autonomy: 'supervised' | 'plan-gated' | 'dark' | 'trivial';
  intent?: string;
  touches?: string[]; mustNot?: string[];
  oracle?: string;
  evidence: Evidence[];            // file:line | adr | test | screenshot | audit
  escalateIf?: string;
  done?: { sha: string; date: string };
};
type Evidence = { kind: 'file'|'adr'|'test'|'image'|'doc'|'audit'; ref: string };
```

**DoR is derived, not stored:** a task is `ready` only when intent + autonomy + touches + oracle +
`evidence.length >= 2` + escalateIf are all present. The dashboard shows a **cross-project READY queue** —
the single most useful view, and the MCP tool that powers "point me at the next work."

---

## 7. Asset / image strategy (answers "store & display in repo AND dashboard")

**Split by weight × churn, NOT by origin.** Committing *everything* to git bloats history (git stores a full
copy of every binary version forever — clones balloon even after "deletion"). But small stable images are a
non-problem: ~200 KB each × 500 = ~100 MB, which git handles fine. So:

**Guiding principle: in git = what the AGENT needs to reason; object storage = what HUMANS browse.**
An in-repo image the agent `Read`s instantly; a remote one it must download first — so decision-critical
evidence stays local, bulk goes remote.

| Class | Where | Rule of thumb |
|---|---|---|
| **Decision-critical evidence** — the 1 screenshot / DOM-measure / small PDF that *justifies a task or ADR* | **in the repo** `__project__/tasks/assets/<task-id>/` | small (<~1 MB), stable, low-count. Downscale screenshots (no retina full-res); compress. |
| **Bulk / heavy / churny** — video, design exports (PSD/Figma), client asset dumps, regenerated-every-session shots | **object storage** (Vercel Blob / R2 / S3) | anything >~5 MB, or that changes often, or that's browse-only |
| **Dashboard-born uploads** (client pastes an image mid-triage) | object storage → `assets` table | promote to repo only if it becomes evidence (see bridge) |

**The manifest keeps remote assets agent-visible.** For offloaded files, commit a tiny
`__project__/assets/manifest.yml` line — `id · blobUrl · sha256 · caption` — so the agent still *sees the
reference and caption* in-repo (and can fetch the URL if it needs the bytes), without the bytes bloating git.

**Promotion bridge:** when a dashboard-born idea becomes a task, copy its upload into the repo `assets/` folder
**only if small/decision-critical**; otherwise leave it in Blob and write a manifest line. Nothing important is
*unreferenced* — but not everything is *inlined*.

**Git LFS?** Optional middle path (pointer in git, bytes on LFS). Skip by default — LFS adds quota/bandwidth
cost and clone friction; plain object-storage + manifest is simpler for a solo evidence workflow. Reach for LFS
only if you specifically want heavy assets to travel with `git clone`.

**Hygiene (if staying in git):** downscale/compress screenshots · `.gitignore` a scratch `assets/tmp/` for
throwaway shots · commit only the screenshot pinned as *evidence*, not every regenerated frame · soft-cap the
in-repo asset budget (~50–100 MB/project) — cross it → offload.

**Caching layers:** `next/image` + CDN for rendering · `revalidateTag(project)` on GitHub webhook for doc
freshness · `'use cache'` / `unstable_cache` on the ingest aggregation (tag-keyed, never reads request
context inside) · immutable `Cache-Control` on hashed asset URLs (repo-served or Blob).

---

## 8. Auth (better-auth, basic only)

- **Email + password only** this time (no OAuth/social). Single admin identity = you.
- Better-auth over the same Neon/Kysely instance (Kysely adapter). Session cookie gates `/ops/**` via
  `proxy.ts` (Next 16 middleware). `/` and `/projects/**` stay public.
- Optional: a per-project "share" read link later if a client needs to see one board. Deferred.

---

## 9. Killer feature — client-idea triage (real-time, agent + docs)

The flow you described, made concrete. This is the Team-Room / suggestion-inbox pattern from `infinite-oneness`
v6, lifted to portfolio scope.

```
Client says an idea (in a meeting)
   │
   ▼
/ops/[project]/triage  — you type/paste it (+ optional image)
   │
   ▼
Triage agent (Anthropic SDK, streaming SSE)
   • tools (read-only): getDocs(project), searchBacklog, listADRs, getRetro
   • it analyzes against the CURRENT docs → says one of:
       - "overlaps ADR-0019 / duplicates task X"
       - "conflicts with <decision>"
       - "no evidence yet → needs a spike"
       - "clean new task"
   • emits a DRAFT ticket pre-filled with DoR fields
       (intent · proposed autonomy tier · Touches · candidate oracle · evidence it found)
   │
   ▼
You DECIDE (human disposes):
   • Accept → write-back: append the task to the repo's backlog.md via a commit/PR,
              copy any uploaded asset into the repo assets folder
   • Defer  → stored as a decided idea (won't be re-litigated)
   • Dismiss → logged with a one-line reason
```

Why it fits: it turns a hallway idea into either a *grounded, DoR-ready ticket in the canonical backlog* or a
*recorded decision not to build* — in the room, with the docs as the agent's context. It's "presume, don't
assume" enforced at intake: the agent must cite ≥2 evidences from the real docs before it proposes a ticket.

Real-time = SSE agent turns (already proven in v6). Solo → no Pusher needed; add it only if a client shares
the screen live from another device.

---

## 10. MCP surface (query + triage from any Claude session)

Expose the dashboard's read-model + triage as MCP tools so any Claude session (Code, desktop, claude.ai) can:

- `list_projects()` · `project_status(slug)`
- `ready_tasks(slug?)` → tasks passing DoR across one/all projects  ← the headline tool
- `get_doc(slug, kind, id)` → ADR / spec / retro / task
- `create_idea(slug, text, evidence?)` · `promote_idea_to_task(ideaId)` (proposes the write-back; human confirms)

Sequencing: build the read tools first (they only need the ingest + DoR fields). `promote_*` comes after the
write-back path (§9) exists. If you only ever call this from Claude Code inside a repo, a **skill + a local
aggregator script** is the cheaper 80% — graduate to a real MCP server when you want it from other surfaces.

---

## 11. Stack & proposed layout

- **Next.js 16 + TS, RSC-first**, React Compiler on. shadcn (composition components; reuse the `radix-maia`
  muscle memory or start fresh `neutral`). Tailwind v4 (`@theme` in CSS).
- **Kysely + Neon** (mirror `infinite-oneness`), migrations via the same Kysely `Migrator` pattern.
- **better-auth** (basic email/password).
- **Anthropic SDK** for the triage agent (Haiku default — cheapest Claude; upgradeable per the `model` seam).
- **Object storage:** Vercel Blob (or R2). **MCP:** `@modelcontextprotocol/sdk` (stdio locally, http if hosted).

```
portfolio-dashboard/
├── src/app/
│   ├── (public)/                 # portfolio: /, /projects/[slug]
│   └── ops/                      # gated: dashboard, /[project]/triage
├── src/lib/
│   ├── content/                  # ContentSource: fs adapter | github adapter, gray-matter, md render
│   ├── tasks/                    # backlog parser → Task[], DoR deriver (pure)
│   ├── db/                       # kysely, migrations, better-auth tables
│   ├── triage/                   # agent loop, read-only doc tools, draft-ticket schema
│   └── writeback/               # append-to-backlog commit/PR, asset copy
├── src/mcp/                       # MCP server (reuses lib/content + lib/tasks)
└── __project__/                  # this repo's OWN docs (dogfood the convention)
```

---

## 12. Build order (stop at any rung)

1. **Frontmatter schema** (§5) adopted in one project repo. *Keystone.*
2. **ContentSource (fs) + backlog parser + DoR deriver** — pure, unit-tested. No UI yet.
3. **Read-only ops UI**: project list, doc pages (ADR/spec/retro), cross-project READY queue.
4. **better-auth** gate on `/ops`.
5. **Public portfolio** projection (same data, curated).
6. **Asset tiers + caching** (§7).
7. **Triage feature** (§9) — the payoff. Needs the agent + write-back.
8. **MCP** (§10) — read tools first, `promote_*` last.

Rungs 1–3 already deliver the "one view across projects" win. 7 is the differentiator. 8 closes the loop
with your agent sessions.

---

## 13. Open decisions → write these ADRs at kickoff

- **ADR-0001** ContentSource: filesystem-local vs GitHub-API vs build-time clone (recommend: fs first, iface for both).
- **ADR-0002** Write-back mechanism: direct commit to `main` vs open a PR (recommend: PR for real projects, direct for solo scratch).
- **ADR-0003** DoR field spec + "evidence = pointable proof" rule (port from this thread).
- **ADR-0004** Asset tiers + promotion-copy policy.
- **ADR-0005** Triage agent authority (read-only tools; proposes drafts only; human confirms write-back) — direct descendant of infinite-oneness ADR-0029.

---

## 14. Non-goals / deferred

> **Amended 2026-07-28 (ADR-0007):** the original "solo, no team boards" non-goal is **reversed** —
> v2 is explicitly a small-team tool (engineer + PM + QA). The remaining non-goals below still hold.

- ~~No multi-user / team boards (solo).~~ **Reversed** — see the pivot in *Current state* + `specs/v2-grounding.md`.
- **Task editing model:** the dashboard still never becomes a *second source of truth*. Non-technical
  members add/flip/annotate tasks in the UI, but every change **writes back to the repo `backlog.md`**
  (git-free for them; git stays the transport). It does not edit tasks in a private DB. No comments DB
  or attachment store in v2 (repo assets per §7).
- No OAuth (email+password only, v4/F5). No realtime multi-viewer (SSE only) until a real second
  concurrent editor exists. No portfolio CMS — frontmatter is the CMS. No multi-tenant SaaS / billing
  (self-hosted; Cloud tier is v5+ and a separate decision).
```
