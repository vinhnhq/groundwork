import "server-only";
import { cookies } from "next/headers";
import { type AuthAdapter, createMemoryAuthAdapter } from "@/lib/auth/memory-adapter";
import { signToken, verifyToken } from "@/lib/auth/session-token";
import type { Session } from "@/lib/auth/types";
import { SESSION_COOKIE, sessionSecretFrom } from "@/lib/auth-constants";
import { serverEnv } from "@/lib/env-server";

export { SESSION_COOKIE };

const SESSION_DAYS = 7;

export function sessionSecret(): string | null {
  return sessionSecretFrom(
    { BETTER_AUTH_SECRET: serverEnv().BETTER_AUTH_SECRET },
    process.env.NODE_ENV === "production",
  );
}

let adapter: AuthAdapter | undefined;

/**
 * The account store.
 *
 * F5's real adapter — better-auth over Kysely/Neon — is not wired: it cannot be
 * built or verified without `DATABASE_URL` + `BETTER_AUTH_SECRET`, and shipping
 * unverified auth that switches itself on the moment an env var appears is
 * worse than a clearly-labelled gap. `authStatus()` says so out loud, and
 * /ops/integrations shows it.
 */
function getAdapter(): AuthAdapter {
  if (!adapter) adapter = createMemoryAuthAdapter(serverEnv().ADMIN_PASSWORD || undefined);
  return adapter;
}

export type AuthStatus = {
  adapter: "memory" | "better-auth";
  mocked: boolean;
  secretConfigured: boolean;
  databaseConfigured: boolean;
  note: string;
};

export function authStatus(): AuthStatus {
  const env = serverEnv();
  const secretConfigured = Boolean(env.BETTER_AUTH_SECRET?.trim());
  const databaseConfigured = Boolean(env.DATABASE_URL?.trim());

  return {
    adapter: "memory",
    mocked: true,
    secretConfigured,
    databaseConfigured,
    note: !sessionSecret()
      ? "LOCKED: production with no BETTER_AUTH_SECRET — no session can be issued or accepted."
      : databaseConfigured
        ? "DATABASE_URL is set, but the better-auth adapter is not implemented yet — still using the in-memory store."
        : "In-memory accounts, one per role. Sessions are HMAC-signed and expire after 7 days.",
  };
}

export async function getSession(): Promise<Session | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const jar = await cookies();
  const payload = await verifyToken(jar.get(SESSION_COOKIE)?.value, secret);
  if (!payload) return null;

  return {
    user: { id: payload.sub, email: payload.email, name: payload.name, role: payload.role },
    expiresAt: new Date(payload.exp * 1000),
  };
}

export async function signIn(email: string, password: string): Promise<Session | null> {
  // Refuse to mint a session we could not safely sign.
  const secret = sessionSecret();
  if (!secret) return null;

  const user = await getAdapter().verify(email, password);
  if (!user) return null;

  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const token = await signToken(
    { sub: user.id, email: user.email, name: user.name, role: user.role, exp },
    secret,
  );

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp * 1000),
  });

  return { user, expiresAt: new Date(exp * 1000) };
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The demo accounts, **development only**.
 *
 * `listDemoAccounts()` returns the real password so the sign-in page can
 * prefill it — which is a convenience on a laptop and an open door on a public
 * URL: the page would print working `engineer` credentials to every visitor,
 * and setting ADMIN_PASSWORD would only change which password it printed.
 *
 * In production the accounts still exist (the store is in-memory until the
 * better-auth adapter lands) but they are not advertised, so signing in
 * requires knowing an address and the configured ADMIN_PASSWORD.
 */
export const demoAccounts = (): ReturnType<AuthAdapter["listDemoAccounts"]> =>
  process.env.NODE_ENV === "production" ? [] : getAdapter().listDemoAccounts();
