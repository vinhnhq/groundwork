import { expect, test } from "@playwright/test";

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
  await expect(draft.getByText(/missing:/)).toBeVisible();
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
