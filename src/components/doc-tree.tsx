"use client";

import { Check, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "@/components/ui/sidebar";
import type { DocFolder, DocNode } from "@/lib/content/doc-tree";
import type { DocKind } from "@/lib/content/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<DocKind, string> = {
  adr: "ADR",
  spec: "Spec",
  retro: "Retro",
  doc: "Doc",
};

/**
 * The docs tree — the repo's `__project__/` folder structure, navigable.
 *
 * Built on shadcn's own sidebar tree primitives (`SidebarMenuSub*`) plus
 * `Collapsible`, rather than hand-rolled rows: the row height, truncation,
 * hover and active styling all come from the primitive, so a doc row looks like
 * every other sidebar row by construction instead of by a matching class string.
 * Those three components read no sidebar context — only inert CSS groups — so
 * the same markup serves the page-level tree too, and there is one tree, not two.
 *
 * **Folders open one level at a time.** Each folder owns its own `Collapsible`,
 * so expanding one reveals its immediate children *collapsed*; only the folders
 * on the path to the document you are reading start open. A tree that opened
 * everything buried the interesting row under thirty siblings.
 *
 * Folders are `<button>`s — expanding is a view change, not a destination.
 * Leaves are real anchors, so middle-click and open-in-new-tab work.
 */
export function DocTree({
  nodes,
  variant = "page",
  onSelectDoc,
  selected,
}: {
  nodes: DocNode[];
  variant?: Density;
  onSelectDoc?: (doc: SelectedDoc) => void;
  selected?: ReadonlySet<string>;
}) {
  return (
    // The root list drops the primitive's indent rail: at depth 0 there is no
    // parent to connect to, and the border would float against nothing.
    <SidebarMenuSub className="mx-0 border-l-0 px-0" data-testid="doc-tree">
      <DocTreeItems nodes={nodes} variant={variant} onSelectDoc={onSelectDoc} selected={selected} />
    </SidebarMenuSub>
  );
}

/** What a leaf hands back in select mode. */
export type SelectedDoc = { id: string; kind: DocKind; title: string };

/**
 * The tree's rows without a list wrapper.
 *
 * The sidebar nests the tree under the Docs menu row inside the shell's own
 * `SidebarMenuSub`, which *is* the `<ul>` — rendering a second one there would
 * nest a list directly inside a list.
 */
export function DocTreeItems({
  nodes,
  variant = "page",
  onSelectDoc,
  selected,
}: {
  nodes: DocNode[];
  variant?: Density;
  /**
   * Picking a leaf calls this instead of navigating.
   *
   * The triage composer reuses the tree as a file picker: the folder structure is
   * how you find "the architecture one", and a flat list of thirteen titles is
   * not. Same component, so the picker cannot drift from the navigator.
   */
  onSelectDoc?: (doc: SelectedDoc) => void;
  /** Ids to mark as already chosen, in select mode. */
  selected?: ReadonlySet<string>;
}) {
  const pathname = usePathname();
  const active = decodeURIComponent(pathname);

  return (
    <>
      {nodes.map((node) => (
        <TreeNode
          key={nodeKey(node)}
          node={node}
          variant={variant}
          active={active}
          onSelectDoc={onSelectDoc}
          selected={selected}
        />
      ))}
    </>
  );
}

type Density = "page" | "sidebar";

const nodeKey = (node: DocNode) => (node.type === "folder" ? `d:${node.path}` : `f:${node.href}`);

/**
 * Does this folder hold the open document, at any depth?
 *
 * Drives `defaultOpen`, so the path to what you are reading is expanded and
 * nothing else is — the difference between a tree that orients you and one you
 * have to re-collapse on every visit.
 */
function containsActive(folder: DocFolder, active: string): boolean {
  return folder.children.some((child) =>
    child.type === "folder"
      ? containsActive(child, active)
      : decodeURIComponent(child.href) === active,
  );
}

function TreeNode({
  node,
  variant,
  active,
  onSelectDoc,
  selected,
}: {
  node: DocNode;
  variant: Density;
  active: string;
  onSelectDoc?: (doc: SelectedDoc) => void;
  selected?: ReadonlySet<string>;
}) {
  if (node.type === "doc") {
    // Select mode: a leaf is a choice, so it is a button. Navigation mode: a
    // leaf is a destination, so it stays an anchor and keeps middle-click.
    if (onSelectDoc) {
      const isChosen = selected?.has(node.id) ?? false;

      return (
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={isChosen} size="sm">
            <button
              type="button"
              onClick={() => onSelectDoc({ id: node.id, kind: node.kind, title: node.title })}
            >
              <FileText aria-hidden />
              <span>{node.title}</span>
              {isChosen && <Check className="ml-auto size-3.5 shrink-0" aria-label="tagged" />}
            </button>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    }

    const isActive = decodeURIComponent(node.href) === active;

    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          size={variant === "sidebar" ? "sm" : "md"}
        >
          <Link href={node.href} aria-current={isActive ? "page" : undefined}>
            <FileText aria-hidden />
            <span>{node.title}</span>
            {variant === "page" && (
              <Badge variant="outline" className="ml-auto shrink-0">
                {KIND_LABEL[node.kind]}
              </Badge>
            )}
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <Collapsible
      asChild
      // Searching, not orienting: in select mode the whole tree starts open so
      // the file you want is one glance away rather than three clicks.
      defaultOpen={onSelectDoc !== undefined || containsActive(node, active)}
      className="group/folder"
    >
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton asChild size={variant === "sidebar" ? "sm" : "md"}>
            <button type="button">
              <ChevronRight
                aria-hidden
                className="transition-transform group-data-[state=open]/folder:rotate-90"
              />
              <Folder aria-hidden className="group-data-[state=open]/folder:hidden" />
              <FolderOpen aria-hidden className="hidden group-data-[state=open]/folder:block" />
              <span>{node.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                {node.count}
              </span>
            </button>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className={cn(variant === "sidebar" && "mx-2 px-1.5")}>
            {node.children.map((child) => (
              <TreeNode
                key={nodeKey(child)}
                node={child}
                variant={variant}
                active={active}
                onSelectDoc={onSelectDoc}
                selected={selected}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}
