import "server-only";
import { getSession } from "@/lib/auth";
import { type Capability, can } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/types";

/**
 * Does the caller hold this capability, according to the database?
 *
 * The authority behind the edge proxy. The proxy can only read a signed cookie
 * that goes stale after five minutes; when it does, the proxy waves the request
 * through and this is what stops it.
 *
 * Returns a verdict rather than redirecting, because `src/lib` is the pure core
 * and owes nothing to Next's navigation. The redirecting wrapper that pages use
 * lives in `src/app/ops/guard.ts`.
 */
export type CapabilityVerdict =
  | { outcome: "ok"; session: Session }
  | { outcome: "anonymous" }
  | { outcome: "denied"; capability: Capability };

export async function checkCapability(capability: Capability): Promise<CapabilityVerdict> {
  const session = await getSession();
  if (!session) return { outcome: "anonymous" };
  if (!can(session.user.role, capability)) return { outcome: "denied", capability };
  return { outcome: "ok", session };
}

/**
 * The same check for a route handler, which must answer with a status rather
 * than a redirect — a `fetch` for a digest should get a 403, not a 200 whose
 * body is the sign-in page.
 */
export async function capabilityResponse(
  capability: Capability,
): Promise<{ ok: true; session: Session } | { ok: false; response: Response }> {
  const verdict = await checkCapability(capability);
  if (verdict.outcome === "ok") return { ok: true, session: verdict.session };
  return {
    ok: false,
    response:
      verdict.outcome === "anonymous"
        ? new Response("Not signed in.", { status: 401 })
        : new Response("Forbidden.", { status: 403 }),
  };
}
