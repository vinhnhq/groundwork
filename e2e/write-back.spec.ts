import { expect, test } from "@playwright/test";
import { signInAs, visible } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
  await page.goto("/ops/sample/tasks");
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

/**
 * Without this the dry run is unfalsifiable: a message flashes and a reload
 * leaves no trace, which looks identical to a write that silently did nothing.
 */
test("a proposed change survives a reload, with the file it would have written", async ({
  page,
}) => {
  await page.getByTestId("open-capture").click();
  await page.getByLabel("Task ID").fill("Z3.1");
  await page.getByLabel("Title").fill("Should still be here after reload");
  await page.getByTestId("submit-capture").click();
  await expect(page.getByTestId("write-outcome")).toBeVisible();

  await page.reload();

  const proposed = page.getByTestId("proposed-changes");
  await expect(proposed).toBeVisible();
  await expect(proposed).toContainText(/nothing was written to the repo/i);

  // The log is process-scoped, so sibling tests add entries too — scope to ours.
  const entry = proposed.locator("li").filter({ hasText: "add Z3.1" });
  await expect(entry).toHaveCount(1);

  // The evidence: the actual resulting file, containing the new task.
  await entry.getByText(/Resulting backlog\.md/).click();
  await expect(entry.locator("pre")).toContainText("Z3.1");
});

test("a duplicate id is refused with a readable reason", async ({ page }) => {
  await page.getByTestId("open-capture").click();
  await page.getByLabel("Task ID").fill("S1.1");
  await page.getByLabel("Title").fill("Clashes with the fixture task");
  await page.getByTestId("submit-capture").click();

  await expect(page.getByTestId("write-error")).toContainText(/already exists/i);
});

test("flipping a status routes through the same write path", async ({ page }) => {
  const control = visible(page, "status-control-S1.1");
  await expect(control).toBeVisible();

  // One trigger, then the moves — not four buttons in the row.
  await control.click();
  await page.getByRole("menuitem", { name: "in-progress" }).click();

  const outcome = page.getByTestId("write-outcome").first();
  await expect(outcome).toContainText("Proposed");
  await expect(outcome).toContainText("S1.1 → in-progress");
});
