/**
 * Bearer-token gate for the remote MCP door (G4).
 *
 * The remote endpoint is not cookie-gated: an agent connecting from a
 * teammate's machine has no session. Until real auth + roles land (F5/R1), a
 * single shared token is the honest stand-in — recorded as such on
 * /ops/integrations rather than hidden.
 */

export const DEV_TOKEN = "groundwork-dev-token";

export type TokenCheck =
  | { ok: true; mode: "configured" | "dev" }
  | { ok: false; status: 401 | 503; message: string };

/**
 * Resolve and check the token in one place.
 *
 * In production with no `MCP_TOKEN` set we refuse outright rather than fall
 * back to the well-known dev token — a documented default password reachable
 * from the internet is worse than a broken endpoint, because it fails silently.
 */
export function checkBearer(
  authorization: string | null,
  configured: string | undefined,
  isProduction: boolean,
): TokenCheck {
  const expected = configured?.trim() || (isProduction ? undefined : DEV_TOKEN);

  if (!expected) {
    return {
      ok: false,
      status: 503,
      message: "MCP_TOKEN is not configured; the remote MCP endpoint is disabled.",
    };
  }

  const presented = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!presented || presented !== expected) {
    return { ok: false, status: 401, message: "Missing or invalid bearer token." };
  }

  return { ok: true, mode: configured?.trim() ? "configured" : "dev" };
}
