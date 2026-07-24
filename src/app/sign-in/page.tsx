import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Groundwork ops</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to the ops console.</p>
      </div>
      <SignInForm from={from ?? "/ops"} />
      <p className="text-xs text-neutral-400">
        Mock auth (better-auth later). Demo password: <code>groundwork</code>.
      </p>
    </main>
  );
}
