import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/sign-in/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/auth/roles";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // The proxy already gated this. Repeated here so the layout can never render
  // its children without a session if that matcher is ever narrowed.
  if (!session) redirect("/sign-in");

  const { user } = session;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur ">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/ops" className="font-semibold tracking-tight">
            Groundwork
          </Link>
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground ">ops</span>

          {can(user.role, "integrations.view") && (
            <Link
              href="/ops/integrations"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Integrations
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline" data-testid="whoami">
              {user.name} · {ROLE_LABEL[user.role]}
            </span>
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted "
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
