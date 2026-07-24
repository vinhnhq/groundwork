import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/ops");
  await page.getByLabel("Password").fill("groundwork");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/ops$/);
});

test("triage: analyze an idea, ground it to READY, accept → backlog block", async ({ page }) => {
  await page.goto("/ops/sample/triage");

  await page
    .getByLabel("Client idea")
    .fill("Export monthly revenue reports as downloadable spreadsheets");
  await page.getByRole("button", { name: /analyze against docs/i }).click();

  // The agent proposes a draft; it starts NOT ready (boundaries/oracle missing).
  const status = page.getByTestId("dor-status");
  await expect(status).toContainText(/missing/i);
  await expect(page.getByRole("button", { name: /accept/i })).toBeDisabled();

  // Human grounds the ticket.
  await page.getByLabel("Touches (comma-separated)").fill("src/reports");
  await page.getByLabel("Must NOT (comma-separated)").fill("src/db");
  await page.getByLabel(/Oracle/).fill("an e2e exports a valid spreadsheet");
  await page.getByLabel(/Evidence/).fill("spec-reports, ADR-0001");
  await page.getByLabel("Escalate if").fill("export format unclear");

  // DoR flips to READY and Accept enables.
  await expect(status).toContainText("READY");
  await page.getByRole("button", { name: /accept/i }).click();

  await expect(page.getByText(/Would append to sample/)).toBeVisible();
  await expect(page.getByText(/\*\*NEW\*\* Export monthly revenue/)).toBeVisible();
});
