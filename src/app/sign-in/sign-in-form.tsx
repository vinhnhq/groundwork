"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { signInAction } from "./actions";

export function SignInForm({ from }: { from: string }) {
  const [state, action, pending] = useActionState(signInAction, {});

  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-md border border-neutral-300 px-3 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        <span>Sign in</span>
        <span className="sr-only" aria-live="polite">
          {pending ? "Signing in" : ""}
        </span>
      </button>
    </form>
  );
}
