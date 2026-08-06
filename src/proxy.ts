import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { COOKIE_PREFIX, sessionSecretFrom } from "@/lib/auth-constants";
import { can } from "@/lib/auth/roles";
import { capabilityFor } from "@/lib/auth/route-capability";
import { isRole } from "@/lib/auth/types";

/**
 * Gate `/ops/**` behind a session, and route-gate by role (R1).
 *
 * This runs on the edge runtime, where there is no database handle — so it
 * cannot validate a session token against the `session` table. It does two
 * cheaper things instead:
 *
 *   1. **No session cookie at all ⇒ redirect.** Fails closed, and covers the
 *      common case (an unauthenticated visitor) without touching the database.
 *   2. **Signed cookie cache present ⇒ enforce the role.** better-auth signs a
 *      short-lived copy of the session into `<prefix>.session_data`; a forged
 *      or tampered one fails its HMAC and is treated as absent.
 *
 * What it deliberately does *not* do is treat the presence of a session token
 * as proof of a role. When the cookie cache has expired (five minutes) the
 * request falls through to the page — which calls `requireCapability` and
 * checks against the database. The proxy is the fast path; that is the
 * authority. Route handlers and server actions repeat the check too, because
 * each is a callable endpoint and must not trust that someone arrived through
 * a page.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Read the one field explicitly: `process.env` is an index-signature type,
  // so passing it whole shares no declared properties with the parameter.
  const secret = sessionSecretFrom(
    { BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET },
    process.env.NODE_ENV === "production",
  );

  // Production with no BETTER_AUTH_SECRET: accept nobody rather than trust a
  // secret that is published in the repo.
  if (!secret) return signInRedirect(req, pathname);

  const token = getSessionCookie(req, { cookiePrefix: COOKIE_PREFIX });
  if (!token) return signInRedirect(req, pathname);

  const required = capabilityFor(pathname);
  if (!required) return NextResponse.next();

  // The generic only narrows `user`; `getCookieCache` constrains the rest to
  // better-auth's own Session/User shape, so it is inferred rather than restated.
  const cached = await getCookieCache(req, { cookiePrefix: COOKIE_PREFIX, secret });

  // A cache miss or expiry is not a denial — the page re-checks against the
  // database. Denying here would bounce a legitimate signed-in user to
  // /sign-in every five minutes.
  if (!cached) return NextResponse.next();

  const role =
    typeof cached.user.role === "string" && isRole(cached.user.role) ? cached.user.role : "client";

  return can(role, required) ? NextResponse.next() : deniedRedirect(req, required);
}

function signInRedirect(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = "";
  url.searchParams.set("from", pathname);

  const response = NextResponse.redirect(url);
  // Clear stale or tampered cookies so the next request is a clean sign-in.
  for (const { name } of req.cookies.getAll()) {
    if (name.includes(`${COOKIE_PREFIX}.session`)) response.cookies.delete(name);
  }
  return response;
}

function deniedRedirect(req: NextRequest, capability: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/ops";
  url.search = "";
  url.searchParams.set("denied", capability);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/ops/:path*"] };
