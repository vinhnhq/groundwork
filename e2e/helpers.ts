import type { Page } from "@playwright/test";

import type { Role } from "../src/lib/auth/types";

/**
 * The password `bun run seed` sets when `ADMIN_PASSWORD` is unset, which is how
 * both a laptop and CI seed the database. Mirrors `DEV_ACCOUNT_PASSWORD` in
 * src/lib/auth-constants.ts rather than importing it, so the suite signs in
 * with a literal the way a person would.
 */
export const SEED_PASSWORD = "groundwork-dev";

/** The role names are the usernames — see src/db/seed.ts. */
export const USERNAME: Record<Role, string> = {
  engineer: "engineer",
  pm: "pm",
  qa: "qa",
  client: "client",
};

/**
 * The visible instance of a test id.
 *
 * Responsive surfaces render the same control twice — a card list for phones
 * and a table for desktop — with only one displayed. `.first()` would pick by
 * DOM order and land on the hidden one.
 */
export const visible = (page: Page, testId: string) =>
  page.locator(`[data-testid="${testId}"]:visible`);

/** Sign in as a role and land on /ops. */
export async function signInAs(page: Page, role: Role = "engineer"): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(USERNAME[role]);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Match on the pathname, not a substring: the sign-in URL carries
  // `?from=/ops/...`, so a loose /\/ops/ regex passes while still signed out.
  await page.waitForURL((url) => url.pathname.startsWith("/ops"));
}

/** Mirrors src/lib/auth-constants.ts — the secret an attacker can read in the repo. */
export const DEV_SESSION_SECRET = "groundwork-dev-secret-not-for-production";

/** better-auth's cookie names, given the `gw` prefix configured in authOptions. */
export const SESSION_TOKEN_COOKIE = "gw.session_token";
export const SESSION_DATA_COOKIE = "gw.session_data";
