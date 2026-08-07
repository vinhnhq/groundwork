import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string equality for secrets (Q8.2).
 *
 * Every secret comparison in the codebase goes through here — the MCP bearer
 * token and the webhook HMAC signature must not diverge in rigour. The length
 * check comes first because `timingSafeEqual` throws on a length mismatch
 * rather than returning false; leaking the *length* of a secret is accepted,
 * matching the webhook's original standard.
 */
export function secretEquals(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
