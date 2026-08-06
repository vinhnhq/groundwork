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

/**
 * One digest served an engineer's agent and a client's agent equally badly.
 * The split is a disclosure control: `biz` must not carry the team's internal
 * reasoning, and each door's copy button must agree byte-for-byte with its
 * `context.md?audience=` response (ADR-0004's door-identity rule, per variant).
 */
test("the digest splits by audience, and each variant's doors agree", async ({ page }) => {
  await page.goto("/ops/sample/grounding");

  const preview = page.getByTestId("digest-preview");

  await page.getByTestId("audience-both").click();
  const both = (await preview.textContent()) ?? "";
  expect(both).toContain("## Locked decisions");

  await page.getByTestId("audience-biz").click();
  const biz = (await preview.textContent()) ?? "";

  // The section is gone, and so is the reasoning it carried.
  expect(biz).not.toContain("## Locked decisions");
  expect(biz).not.toContain("Oracle:");
  expect(biz.length).toBeLessThan(both.length);
  // What a delivery conversation still needs.
  expect(biz).toContain("## Current state");
  expect(biz).toContain("## Ready tasks");

  // Each variant's file door serves exactly what its preview shows.
  for (const [audience, shown] of [
    ["both", both],
    ["biz", biz],
  ] as const) {
    const res = await page.request.get(`/ops/sample/context.md?audience=${audience}`);
    expect(res.status()).toBe(200);
    expect((await res.text()).trim(), audience).toBe(shown.trim());
  }
});

/** An unknown audience must fall back to the full digest, never to a partial one. */
test("an unrecognised audience serves the full digest", async ({ page }) => {
  const bogus = await page.request.get("/ops/sample/context.md?audience=nonsense");
  const both = await page.request.get("/ops/sample/context.md?audience=both");
  expect(await bogus.text()).toBe(await both.text());
});
