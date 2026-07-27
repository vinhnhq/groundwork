---
name: ship-review
description: Pre-PR shipping ritual — gates, risk-tiering, adversarial self-review of the diff, then a PR body with findings + real test output, CI watched to green, a fresh-context QA subagent per tier, and a console summary. Run before opening ANY PR from a ticket; also invocable as /ship-review.
---

<!-- Seeded from @vinhnnn/dev-workflow templates/pipeline/ — adapt the
     bracketed placeholders to this project, then own it. -->

# Ship-review — the pre-PR ritual

Run this **unprompted** whenever a ticket's implementation is done and a PR is
about to be opened. The goal: the human is interrupted only for judgment
calls, never for verification.

## 1. Deterministic gates (non-negotiable)

```
bun run lint
bunx tsc --noEmit
bun run test:coverage   # the REAL gate — thresholds included
bun run build
```

E2E only when user-visible behavior changed. **Never weaken a gate to pass
it** — no threshold lowering, no rule disabling, no test deletion without
saying so in the PR body.

## 2. Risk-tier the diff

`git diff main...HEAD --stat`, then classify — the tier decides depth:

| Tier | Touches | Ritual |
|---|---|---|
| **Low** | docs, config, dep bumps, copy | Gates + a read-through; ship. |
| **Medium** | feature/UI code | Full ritual (steps 3–4). |
| **High** | git write-back (commit/PR into a real repo's `backlog.md`), the GitHub token / auth-session gate, the ContentSource write path, MCP surface exposure, DB schemas + migrations (once F5 lands) | Full ritual **+ an explicit "needs your eyes on X" section in the PR body** — the one place the human SHOULD be interrupted pre-merge. |

## 3. Adversarial self-review (medium+)

Read the full diff as a hostile reviewer, in this order:

1. **Tests first, harder than code** — did any assertion get weakened to
   match behavior instead of specifying it? Coverage for new branches?
2. **The project's recorded bug classes** — floating promises
   (`no-floating-promises`); reading request context (`readContext`/ALS)
   inside a cached compute fn (`unstable_cache`/`'use cache'`) — leaks across
   requests; importing `server-only`/`next/headers` from `src/proxy.ts` (Edge)
   — keep Edge-safe constants in `auth-constants.ts`; backlog-parser field-bleed
   (a field value absorbing the next list marker); `Result` narrowing via the
   `_tag` discriminant, never a type guard on the readonly union.
3. **Scope check** — does the diff do only what the ticket asked?

Fix what's real; list what's deferred. Findings go in the PR body either way.

## 4. PR body contract

Every PR opened after this ritual includes: **Intent** (one paragraph) ·
**Risk tier** and why · **Self-review findings** (fixed vs deferred; deferred
gets a backlog line) · **Real test output** (paste the runner's summary line,
never "tests pass") · **Gate changes** (any CI/lint/coverage config touched,
called out loudly).

## 5. CI to green

**The PR is not "opened" until CI is green.** After creating it, run
`gh pr checks <N> --watch`; on any failure, fix forward and push — never
leave a red check for the human to discover. Watch for committed-vs-tree
drift: local gates run against the working tree, CI runs against the commit.

## 6. Local QA pass (fresh context)

Spawn a **QA subagent** — fresh context (it never saw the author's
reasoning), isolated git worktree — with this brief:

> You are the QA engineer for PR #N. Get the PR head DETACHED
> (`gh pr checkout` fails when the branch is checked out elsewhere):
> `git fetch origin <pr-branch> && git checkout --detach FETCH_HEAD`.
> Then: (1) re-run the gates yourself; do not trust the PR body. (2) Read
> the test changes harder than the code — flag assertions weakened to
> match behavior. (3) When the tier calls for it, run the dev server and
> exercise the changed screens like a customer, mobile-width first.
> (4) Check the project's recorded bug classes. (5) Report EVERY finding
> with confidence + severity — the merge step filters, you don't. Post a
> single `gh pr review --comment` ending with one line: safe to merge /
> needs work / high-risk, human review required.

Tier decides QA depth: **low** — skip QA, CI suffices; **medium** — gates +
diff review, plus a browser pass when UI changed; **high** — must exercise
the feature in the running app.

Do not self-approve or merge — **merge stays human**.

## 7. Console summary

Close the ritual by running `bun run summary` (the `work-summary.ts`
companion) and letting its block be the last thing on the console — branch
state, commits ahead, open PRs with check badges, newest `done.md` entry,
latest session cost. A human glancing at a terminal then sees what happened
without opening a browser or a file.
