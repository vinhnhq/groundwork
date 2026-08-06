import type { KeyboardEvent } from "react";

/**
 * Keyboard-activation props for a clickable table row that opens a
 * drawer/detail. Makes the row focusable + operable via Enter/Space without
 * overriding the native `<tr>` row semantics (so screen readers still read it
 * as a table row). Spread onto a `TableRow` and pair with
 * {@link interactiveRowClassName} for a visible focus ring.
 *
 * Ported from infinite-oneness, where it is applied convention-wide across
 * every table so the surfaces don't diverge. Same intent here: the ops tables
 * (tasks, docs) all get it, rather than one of them growing a bespoke
 * `onClick` that keyboard users cannot reach.
 */
export function interactiveRowProps(onActivate: () => void) {
  return {
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  } as const;
}

/** Cursor + focus-ring classes for an interactive row. Merge with the row's
 * own classes (via `cn(...)` or a template string). */
export const interactiveRowClassName =
  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";
