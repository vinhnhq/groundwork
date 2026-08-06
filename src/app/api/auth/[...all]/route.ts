import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

/**
 * better-auth's own endpoints (`/api/auth/**`).
 *
 * Sign-up is disabled in `authOptions`, so the reachable surface here is
 * sign-in, sign-out and session read. When production has no
 * `BETTER_AUTH_SECRET` the instance is `null` and every call 503s, rather than
 * the endpoints quietly signing cookies with the repo's development secret.
 */
const instance = auth();

const locked = () =>
  new Response("Auth is not configured: BETTER_AUTH_SECRET is unset.", {
    status: 503,
    headers: { "content-type": "text/plain" },
  });

export const { GET, POST } = instance ? toNextJsHandler(instance) : { GET: locked, POST: locked };
