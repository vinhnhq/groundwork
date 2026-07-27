import { expect, type Page } from "@playwright/test";
import type { Role } from "../src/lib/auth/types";

export const DEMO_PASSWORD = "groundwork";

export const EMAIL: Record<Role, string> = {
  engineer: "engineer@groundwork.local",
  pm: "pm@groundwork.local",
  qa: "qa@groundwork.local",
  client: "client@groundwork.local",
};

/** Sign in as a role and land on /ops. */
export async function signInAs(page: Page, role: Role = "engineer"): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL[role]);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/ops/);
}
