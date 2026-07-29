# ADR-0009 — Complete the radix-maia token set; borderless tables

Status: Accepted (2026-07-29)

## Context

Asked to lift the admin-table styling from `infinite-oneness` (borderless table, typography
and tag spacing), the first thing a diff showed was that `ui/table.tsx`, `ui/badge.tsx` and
`ui/button.tsx` are **byte-identical** between the two repos. The primitives were never the
difference.

The difference was in `globals.css`, and two parts of it were not stylistic preferences but
**dead references**:

1. `ui/sidebar.tsx` uses `--sidebar-*` **92 times**. `globals.css` defined none of the
   eight. Every `bg-sidebar` / `border-sidebar-border` in the ops workspace resolved to
   nothing.
2. `ui/*` is written against `animate-in` / `animate-out` / `slide-in-*` / `fade-*`. Those
   come from `tw-animate-css`, which was not installed; Tailwind v4 core has none of them.
   Every dialog, sheet, drawer and dropdown mounted with no transition at all.

Both were invisible to lint, tsc and the test suite — a class that resolves to nothing
looks exactly like a class that resolves to a no-op.

## Decision

- **Complete the preset.** Add the eight `--sidebar-*` and five `--chart-*` tokens in both
  schemes plus their `@theme` mappings, matching the radix-maia neutral preset already
  ported. Install `tw-animate-css` and import it.
- **Tables lose the card wrapper.** `rounded-lg border` comes off the tasks, docs and both
  grounding tables. The header rule and row hairlines carry the structure; the border was
  making a dense table read as a box of boxes.
- **Status earns a variant, not a hue.** `default` / `secondary` / `destructive` instead of
  a bespoke colour per status. A backlog with five colours spends the reader's attention on
  the column that varies least. `blocked` keeps red — it is the one status asking for
  action. **Tier keeps its colours**: they encode risk, not state.
- **Rows are clickable only where there is somewhere to go.** Docs rows navigate, via the
  ported `interactiveRowProps` (focusable, Enter/Space, `<tr>` semantics intact), and keep
  their inner anchor so middle-click, open-in-new-tab and the link role survive.

## Consequences

- `interactive-row` lives in `src/components/`, not `src/lib/` — biome enforces that the
  pure core imports no React, and the helper takes a `KeyboardEvent`.
- **The tasks table deliberately does not get an interactive row.** There is no task detail
  view to open. A focusable row with a pointer cursor that does nothing is worse than a
  plain one; the reference has one because it opens a drawer, and copying the affordance
  without the destination would be cargo-culting.
- Filtering on the tasks table is client-side. A backlog is tens of rows, so a round-trip
  per filter change buys nothing.
- Verified by rendering both colour schemes and reading the *computed* value off the
  painted sidebar element — the failure mode here is a token that silently resolves to
  nothing, which no assertion about class names would have caught.
