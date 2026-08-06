"use client";

import { ArrowLeft, Brain, FileText, LayoutDashboard, ListTodo, Sparkles } from "lucide-react";
import Link from "next/link";

import { type NavGroup, SidebarShell } from "@/components/app-shell/sidebar-shell";
import { DocTreeItems } from "@/components/doc-tree";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { DocNode } from "@/lib/content/doc-tree";

/** Reading a document lives under a doc-kind segment, not under `/docs`. */
const IN_DOC = /^\/ops\/[^/]+\/(adr|spec|retro|doc)(\/|$)/;

/**
 * The per-project workspace chrome.
 *
 * Nav is grouped by **capability** rather than in one undifferentiated list:
 * Workspace is what every signed-in role can read, Grounding needs
 * `grounding.read`, and the Agent needs `agent.run`. A group whose items a role
 * cannot use is absent rather than empty or disabled — a disabled row invites
 * "how do I enable this?", which for a PM has no useful answer. The routes are
 * gated in the proxy and re-checked against the database regardless (ADR-0008).
 *
 * Grouping this way also makes the labels explain *why* a client sees three rows
 * where the engineer sees five, instead of leaving it to be inferred.
 */
export function ProjectShell({
  slug,
  name,
  counts,
  docTree,
  mayGround,
  mayAgent,
  headerActions,
  profile,
  children,
}: {
  slug: string;
  name: string;
  counts: { docs: number; tasks: number; ready: number };
  /** The repo's `__project__/` tree, nested under the Docs row while in Docs. */
  docTree: DocNode[];
  mayGround: boolean;
  mayAgent: boolean;
  /** Theme + sign out, on the right of the workspace header. */
  headerActions?: React.ReactNode;
  /** Who you are, at the foot of the sidebar (server component). */
  profile?: React.ReactNode;
  children: React.ReactNode;
}) {
  const base = `/ops/${slug}`;

  const nav: NavGroup[] = [
    {
      label: "Workspace",
      items: [
        { label: "Overview", href: base, icon: LayoutDashboard, exact: true },
        {
          label: "Docs",
          href: `${base}/docs`,
          icon: FileText,
          badge: counts.docs,
          alsoActive: (p) => IN_DOC.test(p),
          subtree:
            docTree.length > 0 ? <DocTreeItems nodes={docTree} variant="sidebar" /> : undefined,
        },
        { label: "Tasks", href: `${base}/tasks`, icon: ListTodo, badge: counts.tasks },
      ],
    },
    // Grounding and the agent are distinct abilities, so they are distinct
    // groups — the heading is the explanation.
    ...(mayGround
      ? [
          {
            label: "Grounding",
            items: [{ label: "Digest", href: `${base}/grounding`, icon: Brain }],
          },
        ]
      : []),
    ...(mayAgent
      ? [{ label: "Agent", items: [{ label: "Triage", href: `${base}/triage`, icon: Sparkles }] }]
      : []),
  ];

  return (
    <SidebarShell
      nav={nav}
      header={
        // The project name alone. "All projects" moved to the footer — leaving
        // it up here made the first thing you read a way *out* of the project
        // you just opened. The status badge is on the Overview, where there is
        // room to mean something.
        <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <span className="truncate font-semibold">{name}</span>
        </div>
      }
      footer={
        <div className="flex flex-col gap-1 group-data-[collapsible=icon]:hidden">
          {profile}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="All projects">
                <Link href="/ops">
                  <ArrowLeft aria-hidden />
                  <span>All projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      }
      breadcrumb={
        <>
          <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
            <Link href="/ops" className="text-muted-foreground hover:text-foreground">
              Projects
            </Link>
            <span className="mx-1.5 text-muted-foreground">/</span>
            <span className="font-medium">{name}</span>
          </nav>
          {headerActions && <div className="ml-auto">{headerActions}</div>}
        </>
      }
    >
      {children}
    </SidebarShell>
  );
}
