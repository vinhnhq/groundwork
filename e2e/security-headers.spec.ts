import { expect, test } from "@playwright/test";

/**
 * The E2E server runs a production build, so this pins the *shipping* policy.
 *
 * `'unsafe-eval'` is granted in development because React's dev build and Next's
 * HMR client need it — without it the console throws on every page load. The
 * risk is that the dev relaxation quietly becomes the production one, which
 * nobody would notice by looking at the app. This is the tripwire.
 */
test("production CSP grants neither unsafe-eval nor websockets", async ({ request }) => {
  const response = await request.get("/sign-in");
  const csp = response.headers()["content-security-policy"] ?? "";

  expect(csp, "no CSP header at all").not.toBe("");
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).not.toMatch(/\bwss?:/);

  // And the parts that must stay.
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
});

test("the other hardening headers are present", async ({ request }) => {
  const headers = (await request.get("/sign-in")).headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
