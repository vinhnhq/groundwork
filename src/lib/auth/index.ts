import "server-only";
import { headers } from "next/headers";
import { databaseConfigured } from "@/db";
import { SESSION_DAYS } from "@/lib/auth/options";
import { auth, sessionSecret } from "@/lib/auth/server";
import { isRole, ROLES, type Role, type Session } from "@/lib/auth/types";
import { COOKIE_PREFIX, DEV_ACCOUNT_PASSWORD } from "@/lib/auth-constants";
import { serverEnv } from "@/lib/env-server";

export { COOKIE_PREFIX, sessionSecret };

export type AuthStatus = {
  adapter: "better-auth";
  mocked: boolean;
  secretConfigured: boolean;
  databaseConfigured: boolean;
  note: string;
};

export function authStatus(): AuthStatus {
  const env = serverEnv();
  const secretConfigured = Boolean(env.BETTER_AUTH_SECRET?.trim());
  const hasDb = databaseConfigured();

  return {
    adapter: "better-auth",
    // No longer a mock: real accounts, real scrypt hashes, a real session
    // table. Without a database there is nothing to authenticate *against*,
    // which is a broken deployment rather than a mocked one.
    mocked: false,
    secretConfigured,
    databaseConfigured: hasDb,
    note: !sessionSecret()
      ? "LOCKED: production with no BETTER_AUTH_SECRET — no session can be issued or accepted."
      : !hasDb
        ? "DATABASE_URL is unset — better-auth has no store, so no one can sign in. Run `docker compose up -d` then `bun run migrate && bun run seed`."
        : "better-auth over Kysely/Neon: username + password, no social providers. Sessions last 7 days; the edge proxy reads a 5-minute signed cookie cache.",
  };
}

/** The role better-auth stored, narrowed — an unknown value is not a licence. */
const roleOf = (value: unknown): Role =>
  typeof value === "string" && isRole(value) ? value : "client";

/**
 * The current session, read from the database.
 *
 * Authoritative: it validates the session token against the `session` table on
 * every call, so a revoked session stops working immediately. The proxy's
 * cookie-cache check is the fast path in front of this, not a replacement —
 * see `requireCapability`.
 */
export async function getSession(): Promise<Session | null> {
  const instance = auth();
  if (!instance) return null;

  const result = await instance.api.getSession({ headers: await headers() });
  if (!result) return null;

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: roleOf((result.user as { role?: unknown }).role),
    },
    expiresAt: new Date(result.session.expiresAt),
  };
}

/**
 * Sign in with a username and password.
 *
 * Returns `null` for every failure — unknown username, wrong password, locked
 * instance — because naming which one was wrong turns the form into an account
 * enumerator.
 */
export async function signIn(username: string, password: string): Promise<Session | null> {
  const instance = auth();
  if (!instance) return null;

  try {
    const result = await instance.api.signInUsername({
      body: { username, password },
      // Required for better-auth to write the session cookie through Next's
      // cookie store; without it the call succeeds and the browser gets nothing.
      headers: await headers(),
      asResponse: false,
    });
    if (!result) return null;

    // Build the session from what sign-in returned rather than calling
    // `getSession()`. `getSession()` reads `headers()`, which are the *incoming*
    // request's headers — the cookie this call just issued is not in them, so it
    // returns null and the caller reports a perfectly good password as wrong.
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: roleOf((result.user as { role?: unknown }).role),
      },
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    };
  } catch {
    // Unknown username, wrong password, or an unreachable store — all the same
    // answer to the caller, on purpose.
    return null;
  }
}

export type DevAccount = { username: string; role: Role; password?: string };

/**
 * The seeded accounts, **development only**.
 *
 * Returning the password so the sign-in page can prefill it is a convenience on
 * a laptop and an open door on a public URL: the page would print working
 * `engineer` credentials to every visitor, and setting `ADMIN_PASSWORD` would
 * only change which password it printed. So production gets an empty list —
 * the accounts still exist, they are simply not advertised, and signing in
 * requires knowing the configured `ADMIN_PASSWORD`.
 *
 * The password is omitted (not guessed) when `ADMIN_PASSWORD` is set, because
 * then the seed did not use the development literal and a prefill would be
 * wrong rather than helpful.
 */
export function devAccounts(): DevAccount[] {
  if (process.env.NODE_ENV === "production") return [];
  const seeded = !serverEnv().ADMIN_PASSWORD?.trim();
  return ROLES.map((role) => ({
    username: role,
    role,
    password: seeded ? DEV_ACCOUNT_PASSWORD : undefined,
  }));
}

export async function signOut(): Promise<void> {
  const instance = auth();
  if (!instance) return;
  try {
    await instance.api.signOut({ headers: await headers() });
  } catch {
    // Already signed out, or the store is unreachable. Either way the caller
    // redirects to /sign-in, and a stale cookie fails its next verification.
  }
}
