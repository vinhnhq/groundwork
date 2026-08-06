/**
 * Apply the better-auth schema to the database named by `DATABASE_URL`.
 *
 * better-auth owns its four tables (`user`, `session`, `account`,
 * `verification`) plus whatever its plugins add, and it derives the DDL from
 * the *same* options object the running app uses — so the schema cannot drift
 * from the config the way a hand-written migration would. `getMigrations`
 * diffs the live database against that derivation and applies only what is
 * missing, which makes this safe to re-run.
 *
 *   bun run migrate            # apply to DATABASE_URL
 *   bun run migrate --dry      # print the SQL instead
 *   bun run migrate --test     # apply to DATABASE_TEST_URL
 */
import { getMigrations } from "better-auth/db/migration";

import { dbFor } from "@/db";
import { DEV_SESSION_SECRET } from "@/lib/auth-constants";
import { authOptions } from "@/lib/auth/options";
import { databaseUrl, testDatabaseUrl } from "@/lib/db-url";

async function main() {
  const dry = process.argv.includes("--dry");
  const url = process.argv.includes("--test") ? testDatabaseUrl() : databaseUrl();

  const db = dbFor(url);
  // The secret does not affect the emitted DDL — only cookie signing — so the
  // migration does not need the real one and must not require it.
  const options = authOptions({ secret: DEV_SESSION_SECRET, db });

  const { toBeCreated, toBeAdded, runMigrations, compileMigrations } = await getMigrations(options);

  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    console.log("Schema is up to date — nothing to apply.");
    await db.destroy();
    return;
  }

  for (const t of toBeCreated) console.log(`create table ${t.table}`);
  for (const t of toBeAdded) {
    console.log(`alter table ${t.table} — add ${Object.keys(t.fields).join(", ")}`);
  }

  if (dry) {
    console.log(`\n${await compileMigrations()}`);
  } else {
    await runMigrations();
    console.log("\nApplied.");
  }

  await db.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
