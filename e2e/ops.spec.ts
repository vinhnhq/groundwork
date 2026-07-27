import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

// Mock-auth gate: sign in through the UI before each test.
test.beforeEach(async ({ page }) => {
  await signInAs(page);
});

test("ops overview lists projects, READY queue, and DRAFT list", async ({ page }) => {
  await page.goto("/ops");

  // configured project shows; bare root is "unconfigured", not a crash
  await expect(page.getByRole("heading", { name: "Sample Project" })).toBeVisible();
  await expect(page.getByText(/unconfigured/i)).toBeVisible();

  // ready task in the queue; draft task NOT in the queue
  const ready = page.getByTestId("ready-queue");
  await expect(ready.getByText("S1.1")).toBeVisible();
  await expect(ready.getByText("S1.2")).toHaveCount(0);

  // draft task listed with its missing DoR fields
  const draft = page.getByTestId("draft-list");
  await expect(draft.getByText("S1.2")).toBeVisible();
  // S1.2 lacks four DoR fields, so it shows the compact count rather than the
  // full list — the detail stays in the tooltip.
  const gaps = draft.getByText(/DoR fields missing/);
  await expect(gaps).toBeVisible();
  await expect(gaps).toHaveAttribute("title", /oracle/);
});

test("open a project and render an ADR with a resolved image", async ({ page }) => {
  await page.goto("/ops");
  await page.getByRole("link", { name: "Sample Project" }).click();
  await expect(page).toHaveURL(/\/ops\/sample$/);

  await page.getByRole("link", { name: /Sample decision/ }).click();
  await expect(page.getByRole("heading", { name: /Sample decision/ })).toBeVisible();

  // the relative image resolves through the asset route and actually loads
  const img = page.locator("article img").first();
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
});
