import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
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

/**
 * The triage surface is a conversation: your idea and the agent's verdict as
 * messages, the docs it read as attachments, and a file-tagger so you can point
 * it at the files you know are relevant.
 */
test("triage renders as a message thread and tagging a file steers the verdict", async ({
  page,
}) => {
  await page.goto("/ops/sample/triage");

  // Nothing sent: the composer is the page, no empty transcript above it.
  await expect(page.locator('[data-slot="message"]')).toHaveCount(0);

  /**
   * `@` opens the file picker — the same folder tree the sidebar uses, so the
   * structure is how you find a file rather than a flat list of titles.
   */
  await page.getByLabel("Client idea").click();
  await page.keyboard.type("Add a colour picker to the avatar editor @");

  const picker = page.getByTestId("doc-picker");
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: /decisions/ })).toBeVisible();

  const leaf = picker.getByRole("button", { name: /Sample decision/ });
  const tagged = (await leaf.textContent())?.trim() ?? "";
  await leaf.click();

  // The `@` was a command, not content — it is replaced by the file's title.
  await expect(picker).toBeHidden();
  await expect(page.getByLabel("Client idea")).not.toHaveValue(/@$/);
  await expect(page.locator('[data-slot="attachment"]')).toHaveCount(1);
  await page.getByRole("button", { name: /Analyze against docs/i }).click();

  // Two turns: the idea, then the verdict.
  await expect(page.locator('[data-slot="message"]')).toHaveCount(2);
  await expect(page.locator('[data-slot="bubble"]')).toHaveCount(2);

  // A tagged file is asserted relevant, so it is cited even though the idea's
  // wording does not overlap it — that is what makes tagging worth doing.
  const thread = page.locator('[data-slot="message-scroller-content"]');
  await expect(thread).toContainText("grounded in");
  await expect(thread).toContainText(tagged.replace(/\s+/g, " ").slice(0, 24));

  // And the draft form still follows, with the tag carried into Evidence.
  await expect(page.getByTestId("dor-status")).toBeVisible();
});
