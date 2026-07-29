/** Edge-safe constants (no server-only / next-headers imports) for the proxy. */
export const SESSION_COOKIE = "gw_session";

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
