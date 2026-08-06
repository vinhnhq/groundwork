/**
 * Create one account per role, so every permission path is reachable by hand.
 *
 * Accounts are created through better-auth's own sign-up endpoint rather than
 * by inserting rows: the password hash format (scrypt, with better-auth's
 * parameters) is an implementation detail we would otherwise be duplicating,
 * and a hand-inserted hash that *almost* matches fails at sign-in rather than
 * at seed time. `disableSignUp` is lifted only for this in-process instance —
 * the HTTP route keeps it.
 *
 *   bun run seed                   # seed DATABASE_URL
 *   bun run seed --test            # seed DATABASE_TEST_URL
 *   ADMIN_PASSWORD=... bun run seed
 */
import { betterAuth } from "better-auth";

import { dbFor } from "@/db";
import { DEV_ACCOUNT_PASSWORD, DEV_SESSION_SECRET } from "@/lib/auth-constants";
import { authOptions } from "@/lib/auth/options";
import type { Role } from "@/lib/auth/types";
import { ROLES } from "@/lib/auth/types";
import { databaseUrl, testDatabaseUrl } from "@/lib/db-url";

const NAME: Record<Role, string> = {
  engineer: "Engineer",
  pm: "Product Manager",
  qa: "QA",
  client: "Client",
};

export async function seedAccounts(url: string, password: string) {
  const db = dbFor(url);
  const auth = betterAuth({
    ...authOptions({ secret: DEV_SESSION_SECRET, db }),
    emailAndPassword: { enabled: true, disableSignUp: false, minPasswordLength: 12 },
  });

  const created: Role[] = [];

  for (const role of ROLES) {
    const existing = await db
      .selectFrom("user")
      .select("id")
      .where("username", "=", role)
      .executeTakeFirst();

    if (existing) {
      // Re-running the seed must not reset a password that was changed, nor
      // fail the whole run on the unique constraint.
      await db.updateTable("user").set({ role }).where("id", "=", existing.id).execute();
      continue;
    }

    await auth.api.signUpEmail({
      body: {
        // better-auth's core schema requires an email even when sign-in is by
        // username. `.invalid` is reserved by RFC 6761 and can never resolve,
        // so these addresses cannot be mistaken for deliverable ones.
        email: `${role}@groundwork.invalid`,
        password,
        name: NAME[role],
        username: role,
      },
    });

    // `role` is `input: false`, so sign-up cannot set it — that is the point
    // (a caller must not be able to ask for `engineer`). Set it here, where we
    // are the server.
    await db.updateTable("user").set({ role }).where("username", "=", role).execute();
    created.push(role);
  }

  await db.destroy();
  return created;
}

async function main() {
  const url = process.argv.includes("--test") ? testDatabaseUrl() : databaseUrl();
  const password = process.env.ADMIN_PASSWORD?.trim() || DEV_ACCOUNT_PASSWORD;

  if (password === DEV_ACCOUNT_PASSWORD && process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed production with the development password. Set ADMIN_PASSWORD.",
    );
  }

  const created = await seedAccounts(url, password);
  console.log(
    created.length === 0
      ? "All four accounts already exist — roles re-asserted, passwords untouched."
      : `Created: ${created.join(", ")}`,
  );
  console.log(
    `Sign in with username \`engineer\` and the ${
      process.env.ADMIN_PASSWORD
        ? "ADMIN_PASSWORD"
        : `development password \`${DEV_ACCOUNT_PASSWORD}\``
    }.`,
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
