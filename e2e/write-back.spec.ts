import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
  await page.goto("/ops/sample");
});

test("capture form shows the Definition of Ready filling in live", async ({ page }) => {
  await page.getByTestId("open-capture").click();

  const dor = page.getByTestId("capture-dor");
  await expect(dor).toContainText("DRAFT");
  await expect(dor).toContainText("Intent");

  await page.getByLabel("Task ID").fill("Z1.1");
  await page.getByLabel("Title").fill("A task captured without git");
  await page.getByLabel("Intent").fill("prove US-3");
  await page.getByRole("button", { name: "dark", exact: true }).click();
  await page.getByLabel("Touches").fill("src/a");
  await page.getByLabel("Must NOT").fill("src/b");
  await page.getByLabel("Oracle").fill("this e2e");
  await page.getByLabel("Evidence").fill("ADR-0002, spec v2 US-3");
  await page.getByLabel("Escalate if").fill("the writer is unavailable");

  await expect(dor).toContainText("READY");
});

test("submitting a task reports it as proposed, not saved", async ({ page }) => {
  await page.getByTestId("open-capture").click();
  await page.getByLabel("Task ID").fill("Z2.1");
  await page.getByLabel("Title").fill("Captured task");
  await page.getByTestId("submit-capture").click();

  const outcome = page.getByTestId("write-outcome");
  await expect(outcome).toBeVisible();

  // The default transport is a dry run — it must say so rather than imply a save.
  await expect(outcome).toContainText("Proposed");
  await expect(outcome).toContainText(/dry run/i);
  await expect(outcome).toContainText(/mocked/i);
});

test("a duplicate id is refused with a readable reason", async ({ page }) => {
  await page.getByTestId("open-capture").click();
  await page.getByLabel("Task ID").fill("S1.1");
  await page.getByLabel("Title").fill("Clashes with the fixture task");
  await page.getByTestId("submit-capture").click();

  await expect(page.getByTestId("write-error")).toContainText(/already exists/i);
});

test("flipping a status routes through the same write path", async ({ page }) => {
  const control = page.getByTestId("status-control-S1.1");
  await expect(control).toBeVisible();

  await control.getByRole("button", { name: "in-progress" }).click();

  const outcome = page.getByTestId("write-outcome").first();
  await expect(outcome).toContainText("Proposed");
  await expect(outcome).toContainText("S1.1 → in-progress");
});
