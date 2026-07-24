import { AsyncLocalStorage } from "node:async_hooks";
import type { Kysely, Transaction } from "kysely";
import { cache } from "react";
import type { DB } from "@/lib/db-types";

/**
 * Request-scoped context (tech-standards §5 / ADR-0012). Two mechanisms, one
 * shape: `AsyncLocalStorage` at route-handler / server-action / cron boundaries;
 * `React.cache()` for the RSC tree. Repositories read via `readContext()`.
 * Pure code (derivers/invariants) NEVER reads context — deps are explicit params.
 */
export type RequestUser = { id: number; email: string } | null;

export type RequestContext = {
  db: Kysely<DB>;
  user: RequestUser;
  requestId: string;
};

/** ALS instance. Set at boundaries you own via `runWithContext`. */
export const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Sync read of the ALS store; throws when called outside `runWithContext`. */
export function getContext(): RequestContext {
  const ctx = storage.getStore();
  if (!ctx) throw new Error("getContext() called outside runWithContext()");
  return ctx;
}

/**
 * RSC-tree context. ALS does NOT propagate into Suspense/parallel children, so
 * the render tree reads through this `React.cache()` getter instead. Wired to a
 * real db + session in F5.
 */
export const getRequestContext = cache(async (): Promise<RequestContext> => {
  throw new Error("getRequestContext() is wired in F5 (auth/db)");
});

/**
 * The adapter every repository uses: ALS first (handlers/actions), falling back
 * to the RSC-tree context. So per-entity code doesn't care which side fed it.
 */
export async function readContext(): Promise<RequestContext> {
  return storage.getStore() ?? (await getRequestContext());
}

/**
 * Run `fn` inside a DB transaction, swapping the connection ambiently via ALS —
 * no `ctx`/`txCtx` argument threaded. Any controller doing multiple must-succeed-
 * together writes wraps them here.
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = await readContext();
  return ctx.db
    .transaction()
    .execute((trx: Transaction<DB>) => runWithContext({ ...ctx, db: trx }, fn));
}
