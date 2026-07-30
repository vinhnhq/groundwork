"use client";

import { Check, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type MentionDoc = { id: string; kind: string; title: string; relPath?: string };

/** The live `@…` token: where it starts, and what has been typed after it. */
export type MentionQuery = { start: number; query: string };

/**
 * The `@` token under the caret, or null.
 *
 * A mention ends at whitespace, so `@arch` matches while `@arch and then` does
 * not — otherwise the menu would stay open for the rest of the sentence. It also
 * requires the `@` to start a word, so an email address does not open a file
 * picker mid-typing.
 */
export function mentionAt(value: string, caret: number): MentionQuery | null {
  const upto = value.slice(0, caret);
  const at = upto.lastIndexOf("@");
  if (at === -1) return null;

  const before = at === 0 ? "" : upto[at - 1];
  if (before && !/\s/.test(before)) return null;

  const query = upto.slice(at + 1);
  if (/\s/.test(query)) return null;

  return { start: at, query };
}

/** Case-insensitive subsequence-free substring match over title and path. */
export function filterDocs(docs: readonly MentionDoc[], query: string): MentionDoc[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...docs];
  return docs.filter(
    (d) =>
      d.title.toLowerCase().includes(q) ||
      (d.relPath ?? "").toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q),
  );
}

/**
 * The `@`-mention menu: a context menu at the caret, driven from the keyboard.
 *
 * Rendered where the `@` is rather than under the input, because the token being
 * completed is the thing the menu is about — a list pinned to the bottom of a
 * three-line textarea makes you look away from what you are typing.
 *
 * Focus never leaves the textarea. Arrow keys and Enter are handled by the
 * caller (which owns the key events) and passed in as `activeIndex`; this
 * component only draws, and reports its option count back so the caller can
 * clamp. That split is what keeps the caret blinking in the input the whole time.
 */
export function DocMention({
  docs,
  taggedIds,
  activeIndex,
  point,
  onPick,
}: {
  docs: MentionDoc[];
  taggedIds: ReadonlySet<string>;
  activeIndex: number;
  /** Caret position within the textarea, in px. */
  point: { top: number; left: number; lineHeight: number };
  onPick: (doc: MentionDoc) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the highlighted row in view as the arrows walk past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (docs.length === 0) {
    return (
      <MenuShell point={point}>
        <p className="px-2 py-1.5 text-sm text-muted-foreground">No matching file</p>
      </MenuShell>
    );
  }

  return (
    <MenuShell point={point}>
      <div
        ref={listRef}
        // A listbox, not a menu: the options complete a value in the field the
        // caret is still in, which is what `aria-activedescendant` describes.
        role="listbox"
        aria-label="Tag a file"
        className="max-h-64 overflow-y-auto"
        data-testid="doc-mention"
      >
        {docs.map((doc, index) => (
          <button
            key={doc.id}
            type="button"
            id={`mention-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            data-index={index}
            // Pointer down, not click: a click fires after blur, and blurring the
            // textarea closes the menu before the selection lands.
            onPointerDown={(e) => {
              e.preventDefault();
              onPick(doc);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm",
              index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted",
            )}
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{doc.title}</span>
              {doc.relPath && (
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {doc.relPath}
                </span>
              )}
            </span>
            {taggedIds.has(doc.id) && (
              <Check className="size-3.5 shrink-0" aria-label="already tagged" />
            )}
          </button>
        ))}
      </div>
    </MenuShell>
  );
}

/**
 * The floating panel, placed at the caret.
 *
 * Absolutely positioned inside the composer's relative wrapper rather than in a
 * portal: it has to move with the textarea, and a portal would need the caret
 * re-measured against the viewport on every scroll.
 */
function MenuShell({
  point,
  children,
}: {
  point: { top: number; left: number; lineHeight: number };
  children: React.ReactNode;
}) {
  return (
    <div
      // One line below the caret, so the menu never covers the character being
      // completed.
      style={{ top: point.top + point.lineHeight + 4, left: point.left }}
      className="absolute z-50 w-80 max-w-[min(20rem,calc(100%-1rem))] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {children}
    </div>
  );
}

/** Wrap `n` into `[0, length)`, so the arrows cycle instead of dead-ending. */
export function wrapIndex(n: number, length: number): number {
  if (length === 0) return 0;
  return ((n % length) + length) % length;
}

/** Convenience for the caller: memoised filtered list + clamped active index. */
export function useMentionOptions(docs: MentionDoc[], mention: MentionQuery | null) {
  const options = useMemo(
    () => (mention ? filterDocs(docs, mention.query) : []),
    [docs, mention],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  // A new query means a new list; keeping the old index would highlight a row
  // unrelated to what was just typed.
  useEffect(() => {
    setActiveIndex(0);
  }, [mention?.query]);

  return { options, activeIndex, setActiveIndex };
}
