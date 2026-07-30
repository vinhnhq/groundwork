"use client";

import { Loader2, LogIn } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
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

        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* One message for both an unknown username and a wrong password —
              naming which was wrong turns the form into an account enumerator. */}
          {state.error && (
            <FieldDescription role="alert" className="text-destructive">
              {state.error}
            </FieldDescription>
          )}
        </Field>

        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
          Sign in
          <span className="sr-only" aria-live="polite">
            {pending ? "Signing in" : ""}
          </span>
        </Button>
      </form>

      {accounts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Seeded accounts — one per role, so every permission path is reachable by hand
          </p>
          <ItemGroup>
            {accounts.map((account) => (
              <Item
                key={account.username}
                asChild
                size="sm"
                className="cursor-pointer hover:bg-muted"
              >
                <button
                  type="button"
                  data-testid={`demo-${account.role}`}
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password ?? "");
                  }}
                >
                  <ItemContent>
                    <ItemTitle>
                      {ROLE_LABEL[account.role]} ·{" "}
                      <code className="text-xs">{account.username}</code>
                    </ItemTitle>
                    <ItemDescription>{ROLE_BLURB[account.role]}</ItemDescription>
                  </ItemContent>
                </button>
              </Item>
            ))}
          </ItemGroup>
        </div>
      )}
    </div>
  );
}
