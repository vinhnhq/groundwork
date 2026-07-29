import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
});

test("ops home is a project directory and nothing else", async ({ page }) => {
  await page.goto("/ops");

  // The configured project shows; a bare root is "unconfigured", not a crash.
  await expect(page.getByText("Sample Project")).toBeVisible();
  await expect(page.getByText(/unconfigured/i)).toBeVisible();

  // The cross-project queues used to live here and now do not — per-project
  // work belongs in that project's workspace.
  await expect(page.getByTestId("ready-queue")).toHaveCount(0);
  await expect(page.getByTestId("draft-list")).toHaveCount(0);
});

test("a project opens into the workspace, with its sections in the sidebar", async ({ page }) => {
  await page.goto("/ops");
  await page.getByText("Sample Project").click();
  await expect(page).toHaveURL(/\/ops\/sample$/);

  const nav = page.getByRole("navigation").first();
  for (const section of ["Overview", "Docs", "Tasks", "Grounding"]) {
    await expect(page.getByRole("link", { name: section }).first()).toBeVisible();
  }
  await expect(nav).toBeVisible();
});

test("Tasks lists the backlog with its readiness", async ({ page }) => {
  await page.goto("/ops/sample/tasks");

  const row = page.getByRole("row").filter({ hasText: "S1.1" });
  await expect(row).toContainText("ready");

  // S1.2 lacks four DoR fields → compact count, detail in the tooltip.
  const draftRow = page.getByRole("row").filter({ hasText: "S1.2" });
  const gaps = draftRow.getByText(/DoR fields missing/);
  await expect(gaps).toBeVisible();
  await expect(gaps).toHaveAttribute("title", /oracle/);
});

test("open a doc from the Docs table and render its image", async ({ page }) => {
  await page.goto("/ops/sample/docs");

  await page.getByRole("link", { name: /Sample decision/ }).click();
  await expect(page.getByRole("heading", { name: /Sample decision/ })).toBeVisible();

  // The relative image resolves through the asset route and actually loads.
  const img = page.locator("article img").first();
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
});
