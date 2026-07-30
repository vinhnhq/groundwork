"use client";

import { Check, ChevronLeft, ChevronRight, FileText, Folder } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DocFolder, DocNode } from "@/lib/content/doc-tree";
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

/** Case-insensitive substring match over title, path and id. */
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

/** Wrap `n` into `[0, length)`, so the arrows cycle instead of dead-ending. */
export function wrapIndex(n: number, length: number): number {
  if (length === 0) return 0;
  return ((n % length) + length) % length;
}

/** One row of the menu: a folder to descend into, or a file to take. */
export type MentionRow =
  | { type: "folder"; name: string; path: string; count: number }
  | { type: "doc"; doc: MentionDoc };

/** The children at `path`, folders first — the level the menu is showing. */
export function levelAt(nodes: readonly DocNode[], path: readonly string[]): MentionRow[] {
  let level: readonly DocNode[] = nodes;

  for (const segment of path) {
    const next = level.find(
      (n): n is DocFolder => n.type === "folder" && n.name === segment,
    );
    if (!next) return [];
    level = next.children;
  }

  return level.map((node) =>
    node.type === "folder"
      ? { type: "folder", name: node.name, path: node.path, count: node.count }
      : {
          type: "doc",
          doc: { id: node.id, kind: node.kind, title: node.title, relPath: node.relPath },
        },
  );
}

/**
 * The `@`-mention menu: a drill-down folder tree at the caret.
 *
 * Two modes, because they answer different questions. With no query it shows one
 * folder level at a time — pick the parent, then the child — which is how you
 * find a file you could not have named. Type anything and it flattens to a
 * filtered search across every document, which is how you find one you could.
 *
 * `position: fixed` against viewport coordinates rather than absolute inside the
 * composer: `Card` is `overflow-hidden`, so an absolutely-positioned menu was
 * clipped at the card's edge — visibly cut off mid-row. Fixed also makes flipping
 * above the caret trivial, which matters now the composer sits at the bottom of
 * the screen and there is no room below it.
 *
 * Focus never leaves the textarea. The caller owns the key events and passes
 * `activeIndex` in; this component only draws.
 */
export function DocMention({
  rows,
  taggedIds,
  activeIndex,
  breadcrumb,
  anchor,
  onPick,
  onEnter,
  onUp,
}: {
  rows: MentionRow[];
  taggedIds: ReadonlySet<string>;
  activeIndex: number;
  /** Folder names from the root to the level on screen. */
  breadcrumb: readonly string[];
  /** Caret position in *viewport* coordinates. */
  anchor: { top: number; left: number; lineHeight: number };
  onPick: (doc: MentionDoc) => void;
  onEnter: (folderName: string) => void;
  onUp: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  // Open upward when there is not room below — the composer is pinned to the
  // bottom, so downward is usually the wrong way.
  useEffect(() => {
    const height = shellRef.current?.offsetHeight ?? 0;
    setFlip(anchor.top + anchor.lineHeight + height + 8 > window.innerHeight);
  }, [anchor.top, anchor.lineHeight, rows.length]);

  /**
   * Keep the highlight in view by moving the list's own scrollTop.
   *
   * `scrollIntoView` scrolls every scrollable ancestor, which dragged the whole
   * composer around as the arrows walked the list.
   */
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!list || !row) return;

    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [activeIndex, rows]);

  const style = flip
    ? { top: anchor.top - 6, left: anchor.left, transform: "translateY(-100%)" }
    : { top: anchor.top + anchor.lineHeight + 4, left: anchor.left };

  return (
    <div
      ref={shellRef}
      style={style}
      className="fixed z-50 w-80 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {breadcrumb.length > 0 && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onUp();
          }}
          className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
        >
          <ChevronLeft className="size-3" aria-hidden />
          <span className="truncate font-mono">{breadcrumb.join("/")}</span>
        </button>
      )}

      {rows.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">No matching file</p>
      ) : (
        <div
          ref={listRef}
          // A listbox, not a menu: the options complete a value in the field the
          // caret is still in, which is what `aria-activedescendant` describes.
          role="listbox"
          aria-label="Tag a file"
          className="max-h-64 overflow-y-auto"
          data-testid="doc-mention"
        >
          {rows.map((row, index) => {
            const active = index === activeIndex;
            const key = row.type === "folder" ? `d:${row.path}` : `f:${row.doc.id}`;

            return (
              <button
                key={key}
                type="button"
                id={`mention-${index}`}
                role="option"
                aria-selected={active}
                data-index={index}
                data-row-type={row.type}
                // Pointer down, not click: click fires after blur, and blurring
                // the textarea closes the menu before the selection lands.
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (row.type === "folder") onEnter(row.name);
                  else onPick(row.doc);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                {row.type === "folder" ? (
                  <>
                    <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {row.count}
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  </>
                ) : (
                  <>
                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{row.doc.title}</span>
                      {row.doc.relPath && (
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {row.doc.relPath}
                        </span>
                      )}
                    </span>
                    {taggedIds.has(row.doc.id) && (
                      <Check className="size-3.5 shrink-0" aria-label="already tagged" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The rows to show, and where in the tree we are.
 *
 * A query flattens the whole tree to a filtered list; an empty one walks it a
 * level at a time. Typing therefore abandons the current folder on purpose —
 * searching is a different intent from browsing, and staying scoped to a folder
 * you had drilled into would silently hide matches.
 */
export function useMentionRows({
  docs,
  tree,
  mention,
}: {
  docs: MentionDoc[];
  tree: DocNode[];
  mention: MentionQuery | null;
}) {
  const [path, setPath] = useState<string[]>([]);
  const query = mention?.query ?? "";

  const rows = useMemo<MentionRow[]>(
    () =>
      query.trim()
        ? filterDocs(docs, query).map((doc) => ({ type: "doc", doc }))
        : levelAt(tree, path),
    [docs, tree, query, path],
  );

  const [activeIndex, setActiveIndex] = useState(0);

  // A new query or a new folder means a new list; keeping the old index would
  // highlight a row unrelated to what was just typed.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, path]);

  // Closing resets the walk, so the next `@` starts at the root rather than
  // wherever the last one left off.
  useEffect(() => {
    if (!mention) setPath([]);
  }, [mention]);

  return {
    rows,
    activeIndex,
    setActiveIndex,
    breadcrumb: query.trim() ? [] : path,
    enterFolder: (name: string) => setPath((p) => [...p, name]),
    leaveFolder: () => setPath((p) => p.slice(0, -1)),
    atRoot: path.length === 0,
  };
}
