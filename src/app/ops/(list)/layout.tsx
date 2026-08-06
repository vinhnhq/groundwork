import Link from "next/link";
import { UserChrome } from "@/components/app-shell/user-chrome";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";

/** Top-bar chrome for the ops list pages (directory, integrations). */
export default async function OpsListLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const role = session?.user.role ?? "client";

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/ops" className="font-semibold tracking-tight">
            Groundwork
          </Link>
          <Badge variant="secondary">ops</Badge>

          {can(role, "integrations.view") && (
            <Link
              href="/ops/integrations"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Integrations
            </Link>
          )}

          <div className="ml-auto">
            <UserChrome />
          </div>
        </div>
      </header>
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </>
  );
}
