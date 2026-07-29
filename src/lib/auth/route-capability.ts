import type { Capability } from "@/lib/auth/roles";

/**
 * Which capability a path under `/ops` demands, or `undefined` for "any signed-in role".
 *
 * Shared by the edge proxy and the server-side `requireCapability` guard so the
 * two cannot disagree — when they lived apart, a route added to one was a route
 * ungated in the other.
 */
export function capabilityFor(pathname: string): Capability | undefined {
  if (pathname.startsWith("/ops/integrations")) return "integrations.view";
  /** `/ops/<project>/triage` — agent surfaces are engineer-only. */
  if (/^\/ops\/[^/]+\/triage/.test(pathname)) return "agent.run";
  /**
   * `/ops/<project>/context.md` and `/grounding` — the digest export. Hiding
   * the Copy-context button from a client is courtesy; this is the control.
   * Found by walking every route as every role.
   */
  if (/^\/ops\/[^/]+\/(context\.md|grounding)$/.test(pathname)) return "grounding.read";
  return undefined;
}
