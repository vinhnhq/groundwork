import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { authOptions } from "@/lib/auth/options";
import { sessionSecretFrom } from "@/lib/auth-constants";
import { serverEnv } from "@/lib/env-server";

export function sessionSecret(): string | null {
  return sessionSecretFrom(
    { BETTER_AUTH_SECRET: serverEnv().BETTER_AUTH_SECRET },
    process.env.NODE_ENV === "production",
  );
}

/**
 * Build the instance.
 *
 * Split out as a named function purely so `ReturnType<typeof build>` can carry
 * the *inferred* type. Annotating the singleton as `ReturnType<typeof betterAuth>`
 * widens it to the plugin-free `Auth<BetterAuthOptions>`, and the username
 * plugin's endpoints — `api.signInUsername` among them — vanish from the type.
 */
function build(secret: string) {
  const options = authOptions({ secret, baseURL: serverEnv().BETTER_AUTH_URL, db: db() });
  return betterAuth({
    ...options,
    // `nextCookies` must be last — it wraps every preceding plugin's endpoints
    // so their `Set-Cookie` headers reach Next's cookie store. Without it
    // `signInUsername` succeeds server-side and the browser is handed nothing,
    // which looks exactly like a wrong password. It lives here rather than in
    // `authOptions` because that module is also loaded by the migration script
    // under plain Bun, where `next/headers` does not resolve.
    plugins: [...options.plugins, nextCookies()],
  });
}

let instance: ReturnType<typeof build> | null = null;

/**
 * The better-auth instance, or `null` when production has no signing secret.
 *
 * `null` means "issue and accept no sessions" rather than sign with the
 * development secret committed to a public repo — the same rule
 * `sessionSecretFrom` applies, kept here so every caller inherits it.
 *
 * Lazy, because `DATABASE_URL` is optional at import time: the marketing page,
 * the MCP door and the filesystem-backed ops routes render without a database,
 * and building at module scope would turn an unset `DATABASE_URL` into a
 * build-time crash for all of them.
 */
export function auth(): ReturnType<typeof build> | null {
  const secret = sessionSecret();
  if (!secret) return null;
  if (!instance) instance = build(secret);
  return instance;
}
