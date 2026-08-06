import { authStatus, devAccounts } from "@/lib/auth";

import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const status = authStatus();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Groundwork ops</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to the ops console.</p>
      </div>

      <SignInForm from={from ?? "/ops"} accounts={devAccounts()} />

      <p className="text-xs text-muted-foreground">{status.note}</p>
    </main>
  );
}
