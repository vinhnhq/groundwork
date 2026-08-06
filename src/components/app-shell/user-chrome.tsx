import { UserRound } from "lucide-react";

import { signOutAction } from "@/app/sign-in/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { getSession } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/auth/roles";

/**
 * Theme and sign out — the only two things the workspace header carries.
 *
 * Who you are moved to `SidebarProfile` at the foot of the sidebar, where it
 * belongs: identity is ambient context, not an action, and it was competing for
 * the header's attention with the breadcrumb that tells you where you are.
 */
export function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}

/** Who you are, for the foot of the sidebar. */
export async function SidebarProfile() {
  const session = await getSession();
  if (!session) return null;

  return (
    <Item size="sm" data-testid="whoami">
      <ItemMedia variant="icon">
        <UserRound aria-hidden />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{session.user.name}</ItemTitle>
        <ItemDescription>{ROLE_LABEL[session.user.role]}</ItemDescription>
      </ItemContent>
    </Item>
  );
}

/**
 * Identity + theme + sign out in one row.
 *
 * Still used by the `/ops` list chrome, which is a top bar with no sidebar to
 * put a profile in the foot of.
 */
export async function UserChrome() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline" data-testid="whoami">
        {session.user.name} · {ROLE_LABEL[session.user.role]}
      </span>
      <ThemeToggle />
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
