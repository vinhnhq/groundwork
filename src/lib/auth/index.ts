import "server-only";
import { cookies } from "next/headers";
import { type AuthAdapter, createMemoryAuthAdapter } from "@/lib/auth/memory-adapter";
import { signToken, verifyToken } from "@/lib/auth/session-token";
import type { Session } from "@/lib/auth/types";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { serverEnv } from "@/lib/env-server";

export { SESSION_COOKIE };

const SESSION_DAYS = 7;

/**
 * Dev fallback so sign-in works with no configuration. Never used when
 * BETTER_AUTH_SECRET is set, and `authStatus()` reports which is in play.
 */
const DEV_SECRET = "groundwork-dev-secret-not-for-production";

export function sessionSecret(): string {
  return serverEnv().BETTER_AUTH_SECRET?.trim() || DEV_SECRET;
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
    note: databaseConfigured
      ? "DATABASE_URL is set, but the better-auth adapter is not implemented yet — still using the in-memory store."
      : "In-memory accounts, one per role. Sessions are HMAC-signed and expire after 7 days.",
  };
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const payload = await verifyToken(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (!payload) return null;

  return {
    user: { id: payload.sub, email: payload.email, name: payload.name, role: payload.role },
    expiresAt: new Date(payload.exp * 1000),
  };
}

export async function signIn(email: string, password: string): Promise<Session | null> {
  const user = await getAdapter().verify(email, password);
  if (!user) return null;

  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const token = await signToken(
    { sub: user.id, email: user.email, name: user.name, role: user.role, exp },
    sessionSecret(),
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

export const demoAccounts = () => getAdapter().listDemoAccounts();
