"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { SidebarResizer, useSidebarWidth } from "@/components/app-shell/sidebar-resizer";
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
  SidebarMenuSub,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
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
  /**
   * Extra paths that also make this item the active section.
   *
   * Docs needs it: reading a document sits at `/ops/<slug>/doc/...`, which does
   * not start with `/ops/<slug>/docs`, so a prefix match alone would drop the
   * highlight (and the nested tree) the moment you opened a file.
   */
  alsoActive?: (pathname: string) => boolean;
  /**
   * A nested navigator, rendered as a sub-menu under this row when the section
   * is active — the docs tree. Inside the primitive's `SidebarMenuSub`, so it
   * reads as part of the same menu rather than a detached panel.
   */
  subtree?: React.ReactNode;
};

export type NavGroup = { label?: string; items: NavItem[] };

/**
 * On a phone the sidebar is a modal sheet, so navigating must also dismiss
 * it — otherwise the destination renders behind the drawer and every doc tap
 * needs a second tap to be seen (Q8.1). Keyed on the pathname rather than on
 * link clicks: one seam catches every navigator (nav rows, the docs tree),
 * and taps that do not navigate — a folder chevron — leave the sheet alone.
 */
function CloseMobileSheetOnNavigate({ pathname }: { pathname: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);
  return null;
}

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
  const { width, commit } = useSidebarWidth();

  const isActive = (item: NavItem) =>
    (item.exact ? pathname === item.href : pathname.startsWith(item.href)) ||
    (item.alsoActive?.(pathname) ?? false);

  return (
    // Collapsed-to-icon nav rows show their label as a tooltip, and current
    // shadcn no longer bundles the provider inside SidebarProvider — so it
    // belongs here in the wrapper rather than as an edit to the pristine file.
    <TooltipProvider delayDuration={0}>
      <SidebarProvider style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}>
        <CloseMobileSheetOnNavigate pathname={pathname} />
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
                        {/* The nested navigator belongs to its menu row, not to a
                            group of its own — and it has no icon-only form, so it
                            goes when the sidebar collapses. */}
                        {item.subtree && isActive(item) && (
                          <SidebarMenuSub
                            className="mr-0 group-data-[collapsible=icon]:hidden"
                            data-testid="doc-tree-nav"
                          >
                            {item.subtree}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {footer && <SidebarFooter>{footer}</SidebarFooter>}
          <SidebarResizer width={width} onCommit={commit} />
        </Sidebar>

        {/* `min-w-0` at the call site, not in `ui/sidebar.tsx` — that file stays
            pristine (CLAUDE.md). Without it the inset keeps `min-width: auto`
            and grows to its widest child instead of shrinking, so a wide
            surface scrolls the page sideways rather than scrolling itself. */}
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 h-4" />
            {breadcrumb}
          </header>
          {/* `min-w-0`: a flex item defaults to `min-width: auto`, so it refuses
              to shrink below its content's intrinsic width. Any wide child — the
              tasks board's `min-w-max` column track is the first — would push
              this column past the viewport and scroll the whole page sideways
              instead of scrolling inside itself. Belongs here rather than on the
              child so every surface inherits it. */}
          <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
