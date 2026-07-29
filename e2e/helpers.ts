import type { Page } from "@playwright/test";
import type { Role } from "../src/lib/auth/types";

export const DEMO_PASSWORD = "groundwork";

export const EMAIL: Record<Role, string> = {
  engineer: "engineer@groundwork.local",
  pm: "pm@groundwork.local",
  qa: "qa@groundwork.local",
  client: "client@groundwork.local",
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
  await page.getByLabel("Email").fill(EMAIL[role]);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Match on the pathname, not a substring: the sign-in URL carries
  // `?from=/ops/...`, so a loose /\/ops/ regex passes while still signed out.
  await page.waitForURL((url) => url.pathname.startsWith("/ops"));
}
