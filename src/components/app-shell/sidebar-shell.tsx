"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * The shared collapsible-sidebar chrome, composed over the pristine
 * `ui/sidebar` primitive — the wrapper-over-pristine rule (CLAUDE.md).
 *
 * Surface-agnostic on purpose: callers supply the header and the nav, and
 * active state is derived from the pathname here so no caller has to thread it.
 */

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match the path exactly — for a section root that would otherwise always match. */
  exact?: boolean;
  /** A count shown on the right of the row. */
  badge?: number;
};

export type NavGroup = { label?: string; items: NavItem[] };

export function SidebarShell({
  header,
  nav,
  footer,
  breadcrumb,
  children,
}: {
  header: React.ReactNode;
  nav: NavGroup[];
  footer?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    // Collapsed-to-icon nav rows show their label as a tooltip, and current
    // shadcn no longer bundles the provider inside SidebarProvider — so it
    // belongs here in the wrapper rather than as an edit to the pristine file.
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>{header}</SidebarHeader>

          <SidebarContent>
            {nav.map((group, index) => (
              <SidebarGroup key={group.label ?? `group-${index}`}>
                {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.label}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.badge !== undefined && item.badge > 0 && (
                          <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {footer && <SidebarFooter>{footer}</SidebarFooter>}
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 h-4" />
            {breadcrumb}
          </header>
          <div className="flex flex-1 flex-col gap-6 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
