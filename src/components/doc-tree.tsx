"use client";

import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { DocNode } from "@/lib/content/doc-tree";
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
 * Two densities from one component, not two components: `sidebar` is the
 * persistent navigator beside the reading pane, `page` is the roomier standalone
 * list. Splitting them would be exactly the divergence ADR-0009 exists to stop —
 * the folder/leaf semantics and the open-state model have to stay identical.
 *
 * Folders are `<button>`s, not links: expanding is a view change, not a
 * destination. Leaves are real anchors, so middle-click and open-in-new-tab work.
 *
 * Open state is local and starts fully expanded. In the sidebar the component
 * lives in the project layout, so React keeps it mounted across doc navigations
 * — a folder you collapse stays collapsed while you read.
 */
export function DocTree({
  nodes,
  openPaths,
  variant = "page",
}: {
  nodes: DocNode[];
  openPaths: string[];
  variant?: "page" | "sidebar";
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(openPaths));
  const pathname = usePathname();

  const toggle = (path: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  return (
    <ul className="flex flex-col" data-testid={variant === "sidebar" ? "doc-tree-nav" : "doc-tree"}>
      {nodes.map((node) => (
        <TreeNode
          key={nodeKey(node)}
          node={node}
          depth={0}
          open={open}
          onToggle={toggle}
          variant={variant}
          pathname={pathname}
        />
      ))}
    </ul>
  );
}

const nodeKey = (node: DocNode) => (node.type === "folder" ? `d:${node.path}` : `f:${node.href}`);

type Density = "page" | "sidebar";

const ROW = {
  page: "py-1.5 pr-2 text-sm",
  sidebar: "py-1 pr-1.5 text-[13px]",
} satisfies Record<Density, string>;

/** Indent per level, in rem. Tighter in the sidebar, which is only 16rem wide. */
const STEP = { page: 1.25, sidebar: 0.75 } satisfies Record<Density, number>;

function TreeNode({
  node,
  depth,
  open,
  onToggle,
  variant,
  pathname,
}: {
  node: DocNode;
  depth: number;
  open: Set<string>;
  onToggle: (path: string) => void;
  variant: Density;
  pathname: string;
}) {
  // Padding rather than nested margins: every row keeps the same full-width hit
  // area, so the hover highlight spans the row at any depth.
  const indent = { paddingLeft: `${depth * STEP[variant] + 0.5}rem` };
  const base =
    "group flex w-full items-center gap-2 rounded-md text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

  if (node.type === "doc") {
    // Compare decoded, because the href percent-encodes each segment while the
    // browser reports the pathname decoded — a doc with a space would never
    // match otherwise.
    const isActive = decodeURIComponent(pathname) === decodeURIComponent(node.href);

    return (
      <li>
        <Link
          href={node.href}
          style={indent}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            base,
            ROW[variant],
            isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("truncate", variant === "page" && "font-medium")}>{node.title}</span>
          {variant === "page" && (
            <Badge variant="outline" className="ml-auto shrink-0">
              {KIND_LABEL[node.kind]}
            </Badge>
          )}
        </Link>
      </li>
    );
  }

  const isOpen = open.has(node.path);

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        aria-expanded={isOpen}
        style={indent}
        className={cn(base, ROW[variant])}
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-90",
          )}
          aria-hidden
        />
        {isOpen ? (
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="truncate font-medium">{node.name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
          {node.count}
        </span>
      </button>

      {isOpen && (
        <ul className="flex flex-col">
          {node.children.map((child) => (
            <TreeNode
              key={nodeKey(child)}
              node={child}
              depth={depth + 1}
              open={open}
              onToggle={onToggle}
              variant={variant}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
