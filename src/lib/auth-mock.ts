import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { serverEnv } from "@/lib/env-server";

/**
 * MOCK auth — a single admin gated by a shared password, session = a cookie.
 * NOT secure; a stand-in for better-auth (tech-standards §7) so the ops console
 * can be gated in the demo. Swap `getSession`/`signIn`/`signOut` for better-auth
 * without touching callers.
 */
export { SESSION_COOKIE };

export type Session = { user: { name: string } } | null;

function expectedPassword(): string {
  return serverEnv().ADMIN_PASSWORD ?? "groundwork";
}

export async function getSession(): Promise<Session> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ? { user: { name: "admin" } } : null;
}

export async function signIn(password: string): Promise<boolean> {
  if (password !== expectedPassword()) return false;
  (await cookies()).set(SESSION_COOKIE, "admin", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
