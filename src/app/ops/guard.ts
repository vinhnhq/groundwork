import "server-only";
import { redirect } from "next/navigation";

import { checkCapability } from "@/lib/auth/require";
import type { Capability } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/types";

/**
 * Require a capability, against the database, or redirect.
 *
 * Every role-gated page must call this. `/ops/integrations` and
 * `/ops/<project>/triage` previously did not — they relied entirely on the edge
 * proxy, so once its five-minute cookie cache expired a client could reach both.
 *
 * Lives in `src/app` rather than `src/lib` because it redirects, and the pure
 * core takes no dependency on Next's navigation (the lint gate enforces this). The
 * decision itself is `checkCapability`; this only chooses how to refuse — with
 * the same `/ops?denied=<capability>` the proxy uses, so the bounce is
 * explained rather than silent regardless of which layer caught it.
 */
export async function requireCapability(capability: Capability): Promise<Session> {
  const verdict = await checkCapability(capability);
  if (verdict.outcome === "anonymous") redirect("/sign-in");
  if (verdict.outcome === "denied") redirect(`/ops?denied=${capability}`);
  return verdict.session;
}
