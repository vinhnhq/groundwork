import { type NextRequest, NextResponse } from "next/server";
import { type Capability, can } from "@/lib/auth/roles";
import { verifyToken } from "@/lib/auth/session-token";
import { SESSION_COOKIE, sessionSecretFrom } from "@/lib/auth-constants";

/**
 * Gate `/ops/**` behind a signed session, and route-gate by role (R1).
 *
 * v1 treated any cookie value as a valid admin. With roles that is no longer
 * survivable — an unsigned cookie would let a client type themselves into the
 * engineer role — so the token's HMAC is verified on every request. Web Crypto,
 * because this runs on the edge runtime where `node:crypto` does not exist.
 *
 * Server actions repeat these checks: the proxy guards navigation, but an
 * action is a callable endpoint and must not trust that someone arrived
 * through a page.
 */
const ROUTE_CAPABILITY: { prefix: string; capability: Capability }[] = [
  { prefix: "/ops/integrations", capability: "integrations.view" },
];

/** `/ops/<project>/triage` — agent surfaces are engineer-only. */
const TRIAGE = /^\/ops\/[^/]+\/triage/;

/**
 * `/ops/<project>/context.md` — the digest export. Hiding the Copy-context
 * button from a client is courtesy; this is the control. Found by walking every
 * route as every role: the client could fetch the digest by URL.
 */
const CONTEXT_EXPORT = /^\/ops\/[^/]+\/(context\.md|grounding)$/;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const payload = await verifyToken(
    req.cookies.get(SESSION_COOKIE)?.value,
    // Read the one field explicitly: `process.env` is an index-signature type,
    // so passing it whole shares no declared properties with the parameter.
    sessionSecretFrom({ BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET }),
  );

  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("from", pathname);

    const response = NextResponse.redirect(url);
    // Clear a stale or tampered cookie so the next request is a clean sign-in.
    if (req.cookies.get(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const required =
    ROUTE_CAPABILITY.find((r) => pathname.startsWith(r.prefix))?.capability ??
    (TRIAGE.test(pathname)
      ? ("agent.run" as const)
      : CONTEXT_EXPORT.test(pathname)
        ? ("grounding.read" as const)
        : undefined);

  if (required && !can(payload.role, required)) {
    const url = req.nextUrl.clone();
    url.pathname = "/ops";
    url.searchParams.set("denied", required);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/ops/:path*"] };
