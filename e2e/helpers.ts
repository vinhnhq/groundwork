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

/** Mirrors src/lib/auth-constants.ts — the secret an attacker can read in the repo. */
export const DEV_SESSION_SECRET = "groundwork-dev-secret-not-for-production";

/**
 * Mint a session token exactly the way the app does, with a chosen secret.
 *
 * Reimplemented here rather than imported so the test signs independently of
 * the code under test: if `signToken` ever changed shape, a shared helper would
 * keep passing while real cookies stopped matching.
 */
export async function signWith(
  secret: string,
  payload: { sub: string; email: string; name: string; role: string; exp: number },
): Promise<string> {
  const encoder = new TextEncoder();
  const toBase64Url = (bytes: Uint8Array) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));

  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}
