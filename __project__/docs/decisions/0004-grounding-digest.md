# ADR-0004 — The grounding digest: what `renderBrain` includes, and its size budget

Status: Accepted (2026-07-28)

## Context

The failure v2 exists to kill (spec `v2-grounding.md` §0): a teammate's agent, lacking the
project's docs, proposes work that contradicts a decision the team already locked. The PM asks
GPT about a feature, GPT has no idea ADR-0001 settled the content source, and the resulting
"plan" is confidently wrong.

The obvious fix — dump the docs into the chat — does not work. `__project__/**` for a real
project is tens of thousands of tokens: it blows a chat context, costs real money per paste, and
*buries* the decision it was supposed to surface. Relevance, not volume, is what grounds an
agent. So the question is not "how do we ship the docs" but **what is the minimum an agent must
know to avoid contradicting the team**, and what happens when even that does not fit.

## Decision

`renderBrain(input) → Brain` is a **pure** function producing one distilled digest per project.

**Included** — the things an ungrounded agent gets wrong:

- **Identity + current state** — name, tagline, status, stack, and counts (ready / draft /
  in-progress / done, ADRs, specs). Cheap, and it orients the agent immediately.
- **Locked decisions** — ADRs whose `Status:` is **Accepted**, reduced to their `## Decision`
  section. This is the load-bearing content: it is precisely what the drifting agent contradicts.
- **Open constraints** — the out-of-scope / non-goal bullets from each spec. Stops an agent
  proposing work the team has already ruled out.
- **READY tasks** — DoR-passing, open tasks. What the agent *should* be reasoning about.

**Excluded**, deliberately:

- **Superseded, Proposed and Rejected ADRs.** A decision that is not current is worse than
  absent — it is actively misleading. Only `Accepted` is "locked".
- **ADR Context and Consequences prose.** Long, and it argues the case rather than stating the
  rule. The agent needs the rule.
- **Done tasks and DRAFT tasks.** Done work is not actionable; a DRAFT task is by definition not
  yet agreed, so putting it in a grounding digest would launder an unfinished idea into a fact.
- **Reversed non-goals.** A bullet opening with `~~strikethrough~~` is how this repo retires a
  non-goal (see `architecture.md §14`). It is no longer a constraint, so it is dropped.
- **Retro docs.** Historical narrative; not current truth.

**Size budget: 8 000 characters by default**, caller-overridable. Roughly two thousand tokens —
small enough to paste into any chat alongside a real question, large enough for a project with a
dozen ADRs. It is a character budget rather than a token budget because the digest must be
tokenizer-agnostic: the whole point is that it feeds GPT and Claude alike.

**Pressure is absorbed in a fixed priority order**, lowest value first:

1. READY tasks (recoverable — the agent can ask for the queue),
2. open constraints,
3. decision *statements* get trimmed to a short form.

**Decisions are never dropped.** If, after all trimming, the decisions alone still exceed the
budget, `renderBrain` serves them **whole** and sets `overBudget: true`, recording the reason in
`omitted[]`. A digest that silently drops a locked decision is worse than no digest: it looks
authoritative while licensing exactly the contradiction this feature exists to prevent. Better to
blow the budget loudly and let a human raise it (the G1 `Escalate if` clause).

Everything the budget removed is named in `omitted[]`, so a caller can always tell a complete
digest from a squeezed one.

## Rationale

- **Purity.** `renderBrain` takes already-read docs, not a `ContentSource`, so it is trivially
  testable and runs identically in the Next process and the standalone MCP process. `loadBrain`
  is the thin async assembler on top — one code path, so the two doors (G2 paste, G3 MCP) cannot
  drift into serving different digests.
- **Precedent.** Descendant of the infinite-oneness v6 Project Brain, which established that a
  curated digest outperforms a raw dump for agent grounding.
- **Selection is the product.** Anyone can concatenate Markdown. The value here is the editorial
  judgement about what is current and what is noise — which is why the include/exclude list above
  is a decision worth recording rather than an implementation detail.

## Consequences

- The digest is only as good as the docs' discipline: an ADR without a `## Decision` section
  falls back to its first paragraph, and an ADR without a `Status:` line is invisible to the
  digest. That pressure toward well-formed ADRs is intended.
- `Accepted` is matched at the start of the `Status:` line, so `Status: Accepted (2026-07-28)`
  works. A project using different status vocabulary would need this extended.
- Constraints are read from **specs only** today. Non-goals living in `architecture.md` are not
  picked up, because that file is not part of the `DocKind` set. If that proves limiting, widen
  the doc set rather than special-casing the filename.
- The budget is characters, so a future token-accurate budget would be a behaviour change worth
  its own note.
