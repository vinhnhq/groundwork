import { Kysely } from "kysely";

import type { DB } from "@/lib/db-types";
import { databaseUrl } from "@/lib/db-url";

import { dialectFor } from "./dialect";

/**
 * The Kysely handle, lazily built.
 *
 * Lazy because `DATABASE_URL` is optional at import time: the marketing page,
 * the MCP door and every filesystem-backed ops route render without a database,
 * and a module-scope `new Kysely(...)` would make an unset `DATABASE_URL` a
 * build-time crash for all of them rather than a sign-in-time error for the one
 * surface that needs it.
 */
let handle: Kysely<DB> | undefined;

export function db(): Kysely<DB> {
  if (!handle) handle = new Kysely<DB>({ dialect: dialectFor(databaseUrl()) });
  return handle;
}

/** True when a database is configured at all — drives `authStatus()`. */
export const databaseConfigured = (): boolean => Boolean(process.env.DATABASE_URL?.trim());

/** Build a handle against an explicit URL. Migrations and tests use this. */
export const dbFor = (url: string): Kysely<DB> => new Kysely<DB>({ dialect: dialectFor(url) });
