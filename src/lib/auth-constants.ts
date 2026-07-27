/** Edge-safe constants (no server-only / next-headers imports) for the proxy. */
export const SESSION_COOKIE = "gw_session";

/**
 * Fallback signing secret so sign-in works with no configuration. Sessions
 * signed with it are still unforgeable by a *client*, which is what roles
 * require; it is not a substitute for a real BETTER_AUTH_SECRET in production,
 * and /ops/integrations says which one is in use.
 */
export const DEV_SESSION_SECRET = "groundwork-dev-secret-not-for-production";

export const sessionSecretFrom = (env: { BETTER_AUTH_SECRET?: string | undefined }): string =>
  env.BETTER_AUTH_SECRET?.trim() || DEV_SESSION_SECRET;
