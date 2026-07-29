import type { BetterAuthOptions } from "better-auth";
import { username } from "better-auth/plugins";
import type { Kysely } from "kysely";
import { ROLES } from "@/lib/auth/types";

/**
 * How long the signed session-data cookie is trusted at the edge.
 *
 * The proxy gates `/ops/**` by role and runs on the edge runtime, where there
 * is no database handle — so the role has to travel in a cookie. Five minutes
 * is the trade: a role change (or a revoked session) keeps its old privileges
 * at the *edge* for at most that long. It is not the last word, because every
 * role-gated page, route and action re-checks against the database
 * (`requireCapability`) — the cookie is a fast path, not the authority.
 */
export const COOKIE_CACHE_SECONDS = 5 * 60;

export const SESSION_DAYS = 7;

/** Cookie prefix — better-auth names its cookies `<prefix>.session_token` etc. */
export const COOKIE_PREFIX = "gw";

/**
 * The better-auth configuration.
 *
 * Deliberately free of `server-only` and of any `process.env` read: the
 * migration script builds these options under plain Bun, outside Next, where
 * both the `server-only` marker and the request-scoped env accessor are
 * unavailable. Callers pass what they have.
 */
export function authOptions({
  secret,
  baseURL,
  db,
}: {
  secret: string;
  baseURL?: string | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: better-auth owns these tables, not our DB type.
  db: Kysely<any>;
}) {
  return {
    secret,
    baseURL,
    // `{ db, type }` rather than a pre-built `kyselyAdapter(...)`: the
    // migration path (`getMigrations`) unwraps this shape to reach the Kysely
    // handle, and rejects an already-constructed adapter outright.
    database: { db, type: "postgres" as const },

    emailAndPassword: {
      enabled: true,
      // Groundwork is a private ops console, not a product with a signup
      // funnel. An open `/api/auth/sign-up/email` would let anyone on the
      // internet mint an account on the deployed instance; accounts are
      // created by `bun run seed` or by hand.
      disableSignUp: true,
      minPasswordLength: 12,
    },

    // No social providers, by decision — ADR-0014. Adding one means
    // registering an OAuth client and carrying its secret, for a console with
    // four accounts.
    plugins: [
      // The role names *are* the usernames, and two of them ("pm", "qa") are
      // two characters — the plugin's default minimum of 3 rejects them, which
      // failed the seed halfway through and left one account created.
      username({ minUsernameLength: 2 }),
    ],

    user: {
      additionalFields: {
        /**
         * The capability role (R1).
         *
         * `input: false` is the load-bearing part: without it the role is a
         * writable field on the sign-up/update payload, and a caller could
         * simply ask to be an `engineer`. It is set server-side only.
         */
        role: {
          type: ROLES as unknown as string[],
          required: false,
          defaultValue: "client",
          input: false,
        },
      },
    },

    session: {
      expiresIn: SESSION_DAYS * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: { enabled: true, maxAge: COOKIE_CACHE_SECONDS },
    },

    advanced: { cookiePrefix: COOKIE_PREFIX },
  } satisfies BetterAuthOptions;
}
