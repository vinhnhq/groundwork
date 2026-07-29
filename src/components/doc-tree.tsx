"use client";

import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import Link from "next/link";
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
 * Folders are `<button>`s rather than links: expanding is a view change, not a
 * destination, and a link that goes nowhere is the affordance mistake the tasks
 * table deliberately avoided (ADR-0009). Leaves are real anchors, so
 * middle-click and open-in-new-tab work.
 *
 * Open state is local and starts fully expanded: a docs tree is tens of nodes,
 * and collapsing by default would hide the very files this page exists to
 * surface.
 */
export function DocTree({ nodes, openPaths }: { nodes: DocNode[]; openPaths: string[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(openPaths));

  const toggle = (path: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  return (
    <ul className="flex flex-col" data-testid="doc-tree">
      {nodes.map((node) => (
        <TreeNode key={nodeKey(node)} node={node} depth={0} open={open} onToggle={toggle} />
      ))}
    </ul>
  );
}

const nodeKey = (node: DocNode) => (node.type === "folder" ? `d:${node.path}` : `f:${node.href}`);

function TreeNode({
  node,
  depth,
  open,
  onToggle,
}: {
  node: DocNode;
  depth: number;
  open: Set<string>;
  onToggle: (path: string) => void;
}) {
  // Padding rather than nested margins: every row keeps the same full-width hit
  // area, so the hover highlight spans the row at any depth.
  const indent = { paddingLeft: `${depth * 1.25 + 0.5}rem` };

  if (node.type === "doc") {
    return (
      <li>
        <Link
          href={node.href}
          style={indent}
          className="group flex items-center gap-2 rounded-md py-1.5 pr-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium">{node.title}</span>
          <Badge variant="outline" className="ml-auto shrink-0">
            {KIND_LABEL[node.kind]}
          </Badge>
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
        className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
            />
          ))}
        </ul>
      )}
    </li>
  );
}
