"use client";

import { ArrowLeft, Brain, FileText, LayoutDashboard, ListTodo, Sparkles } from "lucide-react";
import Link from "next/link";
import { type NavGroup, SidebarShell } from "@/components/app-shell/sidebar-shell";
import { Badge } from "@/components/ui/badge";

/**
 * The per-project workspace chrome: one nav item per section, each its own
 * sub-route (mirroring the infinite-oneness WorkspaceShell shape).
 *
 * Sections a role cannot use are absent rather than disabled — a disabled row
 * invites the question "how do I enable this?", which for a PM has no useful
 * answer. The routes are gated in the proxy regardless.
 */
export function ProjectShell({
  slug,
  name,
  status,
  counts,
  mayGround,
  mayAgent,
  userChrome,
  children,
}: {
  slug: string;
  name: string;
  status: string;
  counts: { docs: number; tasks: number; ready: number };
  mayGround: boolean;
  mayAgent: boolean;
  /** Rendered on the right of the workspace header (server component). */
  userChrome?: React.ReactNode;
  children: React.ReactNode;
}) {
  const base = `/ops/${slug}`;

  const nav: NavGroup[] = [
    {
      items: [
        { label: "Overview", href: base, icon: LayoutDashboard, exact: true },
        { label: "Docs", href: `${base}/docs`, icon: FileText, badge: counts.docs },
        { label: "Tasks", href: `${base}/tasks`, icon: ListTodo, badge: counts.tasks },
        ...(mayGround
          ? [{ label: "Grounding", href: `${base}/grounding`, icon: Brain } as const]
          : []),
        ...(mayAgent ? [{ label: "Triage", href: `${base}/triage`, icon: Sparkles } as const] : []),
      ],
    },
  ];

  return (
    <SidebarShell
      nav={nav}
      header={
        <div className="flex flex-col gap-1 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <Link
            href="/ops"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            All projects
          </Link>
          <span className="truncate font-semibold">{name}</span>
          <Badge variant="secondary" className="w-fit">
            {status}
          </Badge>
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
          {userChrome && <div className="ml-auto">{userChrome}</div>}
        </>
      }
    >
      {children}
    </SidebarShell>
  );
}
