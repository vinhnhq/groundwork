import { betterAuth } from "better-auth";
import { beforeAll, describe, expect, it } from "vitest";
import { dbFor } from "@/db";
import { seedAccounts } from "@/db/seed";
import { authOptions } from "@/lib/auth/options";
import { DEV_SESSION_SECRET } from "@/lib/auth-constants";
import { testDatabaseUrl } from "@/lib/db-url";

/**
 * Auth against a real Postgres (F5).
 *
 * Requires `DATABASE_TEST_URL` and a migrated database — `docker compose up -d`
 * then `bun run migrate --test`. These assertions are the ones a mock cannot
 * make: that the password actually round-trips through better-auth's scrypt,
 * that the unique constraint on `username` is real, and that `disableSignUp`
 * is enforced by the library rather than by our own branch.
 */
const PASSWORD = "integration-test-password";

const db = dbFor(testDatabaseUrl());
const auth = betterAuth(authOptions({ secret: DEV_SESSION_SECRET, db }));

beforeAll(async () => {
  await db.deleteFrom("session").execute();
  await db.deleteFrom("account").execute();
  await db.deleteFrom("user").execute();
  await seedAccounts(testDatabaseUrl(), PASSWORD);
}, 30_000);

describe("username + password sign-in", () => {
  it("signs in each seeded role and carries its role on the session", async () => {
    for (const role of ["engineer", "pm", "qa", "client"] as const) {
      const result = await auth.api.signInUsername({
        body: { username: role, password: PASSWORD },
      });

      expect(result?.user.username, `${role} should sign in`).toBe(role);
      expect((result?.user as { role?: string } | undefined)?.role).toBe(role);
    }
  });

  it("rejects a wrong password", async () => {
    await expect(
      auth.api.signInUsername({ body: { username: "engineer", password: "wrong-password" } }),
    ).rejects.toThrow();
  });

  it("rejects an unknown username", async () => {
    await expect(
      auth.api.signInUsername({ body: { username: "nobody", password: PASSWORD } }),
    ).rejects.toThrow();
  });

  /**
   * Two-character usernames are load-bearing here: `pm` and `qa` are role names
   * and therefore account names, and the plugin's default minimum of three
   * silently failed the seed halfway through before `minUsernameLength` was set.
   */
  it("accepts the two-character role usernames", async () => {
    const pm = await auth.api.signInUsername({ body: { username: "pm", password: PASSWORD } });
    expect(pm?.user.username).toBe("pm");
  });

  it("normalises the username to lower case on lookup", async () => {
    const result = await auth.api.signInUsername({
      body: { username: "ENGINEER", password: PASSWORD },
    });
    expect(result?.user.username).toBe("engineer");
  });
});

describe("the private-console guarantees", () => {
  it("refuses public sign-up, so no one can mint themselves an account", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          email: "intruder@example.com",
          password: PASSWORD,
          name: "Intruder",
          username: "intruder",
        },
      }),
    ).rejects.toThrow();

    const row = await db
      .selectFrom("user")
      .select("id")
      .where("username", "=", "intruder")
      .executeTakeFirst();
    expect(row).toBeUndefined();
  });

  it("stores a hash, never the password itself", async () => {
    const account = await db
      .selectFrom("account")
      .innerJoin("user", "user.id", "account.userId")
      .select("account.password")
      .where("user.username", "=", "engineer")
      .executeTakeFirst();

    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toContain(PASSWORD);
  });

  it("is idempotent: re-seeding creates nothing and leaves passwords working", async () => {
    const created = await seedAccounts(testDatabaseUrl(), "a-completely-different-password");
    expect(created).toEqual([]);

    const still = await auth.api.signInUsername({
      body: { username: "engineer", password: PASSWORD },
    });
    expect(still?.user.username).toBe("engineer");
  });
});
