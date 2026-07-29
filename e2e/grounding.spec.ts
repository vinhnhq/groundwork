import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
});

test("Copy context and context.md serve the identical digest", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ops/sample/grounding");

  const grounding = page.getByTestId("grounding");
  await expect(grounding).toBeVisible();
  // The summary line, not the digest preview further down the panel.
  await expect(grounding.getByText(/locked decision\(s\) ·/)).toBeVisible();

  await page.getByTestId("copy-context").click();
  await expect(page.getByTestId("copy-context")).toHaveText(/Copied/);

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("Sample Project");
  expect(clipboard).toContain("Locked decisions");

  // The other door. Same source (loadBrain), so byte-identical — that identity
  // is the whole point of ADR-0004's "one digest, two doors".
  const response = await page.request.get("/ops/sample/context.md");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/markdown");
  expect(await response.text()).toEqual(clipboard);
});

test("the digest excludes draft tasks and unaccepted decisions", async ({ page }) => {
  const response = await page.request.get("/ops/sample/context.md");
  const digest = await response.text();

  // S1.1 is READY, S1.2 is a DRAFT — only the ready one grounds an agent.
  expect(digest).toContain("S1.1");
  expect(digest).not.toContain("S1.2");
});

test("context.md 404s for an unknown project", async ({ page }) => {
  const response = await page.request.get("/ops/does-not-exist/context.md");
  expect(response.status()).toBe(404);
});
