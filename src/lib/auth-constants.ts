/** Edge-safe constants (no server-only / next-headers imports) for the proxy. */

/**
 * better-auth names its cookies `<prefix>.session_token` and
 * `<prefix>.session_data`, and prefixes both with `__Secure-` when cookies are
 * secure. Nothing should hard-code those names — pass this to better-auth's
 * `getSessionCookie` / `getCookieCache`, which apply the same rules.
 */
export const COOKIE_PREFIX = "gw";

/**
 * Fallback signing secret, for development only.
 *
 * It is a literal in a public repo, so anyone can mint a cookie with it —
 * including one claiming `role: "engineer"`. That is fine on a laptop and
 * catastrophic on a deployed instance, so `sessionSecretFrom` refuses to return
 * it in production rather than quietly signing with it.
 */
export const DEV_SESSION_SECRET = "groundwork-dev-secret-not-for-production";

/**
 * The password `bun run seed` gives the four role accounts when
 * `ADMIN_PASSWORD` is unset.
 *
 * Twelve characters because `minPasswordLength: 12` would otherwise reject the
 * seed. Shared between the seeder and the sign-in page's development hint so
 * the prefill cannot drift from the password that was actually set — and, like
 * the secret above, never offered in production.
 */
export const DEV_ACCOUNT_PASSWORD = "groundwork-dev";

/**
 * The signing secret, or `null` when production has none configured.
 *
 * `null` means "issue and accept no sessions" — the console locks itself
 * instead of trusting a published secret. Same rule the remote MCP door
 * already applied to `MCP_TOKEN`: a documented default credential reachable
 * from the internet fails silently, which is worse than a broken endpoint.
 */
export function sessionSecretFrom(
  env: { BETTER_AUTH_SECRET?: string | undefined },
  isProduction: boolean,
): string | null {
  const configured = env.BETTER_AUTH_SECRET?.trim();
  if (configured) return configured;
  return isProduction ? null : DEV_SESSION_SECRET;
}
