import { signOutAction } from "@/app/sign-in/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/auth/roles";

/** Who you are, theme, sign out — shared by both ops chromes. */
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
