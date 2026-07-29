"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { ROLE_BLURB, ROLE_LABEL } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";
import { signInAction } from "./actions";

export type DemoAccount = { username: string; role: Role; password?: string };

export function SignInForm({ from, accounts }: { from: string; accounts: DemoAccount[] }) {
  const [state, action, pending] = useActionState(signInAction, {});
  const [username, setUsername] = useState(accounts[0]?.username ?? "");
  const [password, setPassword] = useState(accounts[0]?.password ?? "");

  return (
    <div className="flex w-full flex-col gap-5">
      <form action={action} className="flex w-full flex-col gap-4">
        <input type="hidden" name="from" value={from} />

        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 rounded-md border border-input px-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-md border border-input px-3"
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          <span>Sign in</span>
          <span className="sr-only" aria-live="polite">
            {pending ? "Signing in" : ""}
          </span>
        </button>
      </form>

      {accounts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Seeded accounts — one per role, so every permission path is reachable by hand
          </p>
          <div className="flex flex-col gap-1">
            {accounts.map((account) => (
              <button
                key={account.username}
                type="button"
                data-testid={`demo-${account.role}`}
                onClick={() => {
                  setUsername(account.username);
                  setPassword(account.password ?? "");
                }}
                className="flex flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-muted"
              >
                <span className="text-sm">
                  {ROLE_LABEL[account.role]} · <code className="text-xs">{account.username}</code>
                </span>
                <span className="text-xs text-muted-foreground">{ROLE_BLURB[account.role]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
