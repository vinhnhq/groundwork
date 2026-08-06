import { Pool as NeonPool } from "@neondatabase/serverless";
import type { Dialect } from "kysely";
import { PostgresDialect } from "kysely";
import { Pool as PgPool } from "pg";

/**
 * Which driver a Postgres URL needs.
 *
 * Neon's serverless driver tunnels the Postgres protocol over a WebSocket,
 * which is what makes it usable from a serverless function with no long-lived
 * TCP socket; `pg` opens a real socket, which is what a local container speaks
 * and Neon's WebSocket endpoint does not. Neither is a superset of the other,
 * so the URL picks.
 *
 * Exported separately from {@link dialectFor} so the choice is unit-testable
 * without opening a connection.
 */
export function driverFor(url: string): "neon" | "pg" {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    // An unparseable URL is `pg`'s problem to report — it produces a connection
    // error naming the string, where we could only produce "invalid URL".
    return "pg";
  }
  return host.endsWith(".neon.tech") || host.endsWith(".neon.build") ? "neon" : "pg";
}

/**
 * Both branches are a `PostgresDialect` over a pool, deliberately.
 *
 * The obvious alternative, `kysely-neon`'s `NeonDialect`, wraps Neon's *HTTP*
 * client — one statement per request, with `beginTransaction` as a silent
 * no-op. better-auth writes a user and its credential account together, so a
 * transaction that quietly does not roll back would leave an account row with
 * no password behind any partial failure. Neon's `Pool` is API-compatible with
 * `pg`'s and speaks the real protocol over a WebSocket, so transactions work
 * and one dialect covers both environments.
 */
export function dialectFor(url: string): Dialect {
  const pool =
    driverFor(url) === "neon"
      ? new NeonPool({ connectionString: url })
      : new PgPool({ connectionString: url });

  return new PostgresDialect({ pool: pool as unknown as PgPool });
}
